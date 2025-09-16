/**
 * P2P Discovery Service
 *
 * Implements device discovery mechanism for trusted devices within local network.
 * Uses multiple discovery protocols for reliability and cross-platform compatibility.
 *
 * SECURITY: Only announces public key, never private data
 * PRIVACY: Device discovery does not expose user data
 * NETWORK: Multiple protocols for iOS/Android compatibility
 */

import { EventEmitter } from 'events';
import { DeviceInfo, P2PMessage, P2PMessageType, P2PConnectionConfig } from './types';

export interface DiscoveryProtocol {
  name: string;
  isSupported(): boolean;
  startAnnouncement(deviceInfo: DeviceInfo): Promise<void>;
  stopAnnouncement(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
}

export class P2PDiscoveryService extends EventEmitter {
  private deviceInfo: DeviceInfo;
  private config: P2PConnectionConfig;
  private isDiscovering: boolean = false;
  private isListening: boolean = false;
  private discoveredDevices: Map<string, DeviceInfo> = new Map();
  private protocols: DiscoveryProtocol[] = [];
  private discoveryInterval: NodeJS.Timeout | null = null;

  constructor(deviceInfo: DeviceInfo, config: P2PConnectionConfig) {
    super();
    this.deviceInfo = deviceInfo;
    this.config = config;
    this.initializeProtocols();
  }

  /**
   * Initialize available discovery protocols
   * Uses multiple protocols for reliability
   */
  private initializeProtocols(): void {
    // UDP Multicast Discovery (primary)
    this.protocols.push(new UDPMulticastDiscovery(this.config));

    // mDNS/Bonjour Discovery (iOS/macOS)
    this.protocols.push(new MDNSDiscovery(this.config));

    // Bluetooth Low Energy Discovery (mobile)
    this.protocols.push(new BLEDiscovery(this.config));

    // WebRTC Local Network Discovery (fallback)
    this.protocols.push(new WebRTCDiscovery(this.config));

    // Filter to supported protocols only
    this.protocols = this.protocols.filter(protocol => protocol.isSupported());
  }

  /**
   * Start device discovery using all available protocols
   */
  async startDiscovery(): Promise<void> {
    if (this.isDiscovering) {
      return;
    }

    this.isDiscovering = true;

    try {
      // Start listening on all protocols
      await this.startListening();

      // Start announcing this device
      await this.startAnnouncement();

      // Set up periodic re-announcement
      this.discoveryInterval = setInterval(() => {
        this.announceDevice();
      }, this.config.discoveryInterval);

      this.emit('discoveryStarted');
    } catch (error) {
      this.isDiscovering = false;
      this.emit('discoveryError', error);
      throw error;
    }
  }

  /**
   * Stop device discovery
   */
  async stopDiscovery(): Promise<void> {
    if (!this.isDiscovering) {
      return;
    }

    this.isDiscovering = false;

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    // Stop all protocols
    await Promise.all([this.stopAnnouncement(), this.stopListening()]);

    this.emit('discoveryStopped');
  }

  /**
   * Start listening for device announcements
   */
  private async startListening(): Promise<void> {
    if (this.isListening) {
      return;
    }

    this.isListening = true;

    // Start listening on all supported protocols
    const promises = this.protocols.map(async protocol => {
      try {
        await protocol.startListening();
        this.setupProtocolListeners(protocol);
      } catch (error) {
        console.warn(`Failed to start listening on ${protocol.name}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Stop listening for device announcements
   */
  private async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;

    const promises = this.protocols.map(protocol =>
      protocol
        .stopListening()
        .catch(error => console.warn(`Failed to stop listening on ${protocol.name}:`, error))
    );

    await Promise.allSettled(promises);
  }

  /**
   * Start announcing this device
   */
  private async startAnnouncement(): Promise<void> {
    const promises = this.protocols.map(async protocol => {
      try {
        await protocol.startAnnouncement(this.deviceInfo);
      } catch (error) {
        console.warn(`Failed to start announcement on ${protocol.name}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Stop announcing this device
   */
  private async stopAnnouncement(): Promise<void> {
    const promises = this.protocols.map(protocol =>
      protocol
        .stopAnnouncement()
        .catch(error => console.warn(`Failed to stop announcement on ${protocol.name}:`, error))
    );

    await Promise.allSettled(promises);
  }

  /**
   * Announce device on all protocols
   */
  private async announceDevice(): Promise<void> {
    if (!this.isDiscovering) {
      return;
    }

    const updatedDeviceInfo = {
      ...this.deviceInfo,
      discoveredAt: Date.now(),
    };

    const promises = this.protocols.map(async protocol => {
      try {
        await protocol.startAnnouncement(updatedDeviceInfo);
      } catch (error) {
        console.warn(`Failed to announce on ${protocol.name}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Setup listeners for protocol events
   */
  private setupProtocolListeners(protocol: DiscoveryProtocol): void {
    protocol.on('deviceDiscovered', (deviceInfo: DeviceInfo) => {
      this.handleDiscoveredDevice(deviceInfo, protocol.name);
    });

    protocol.on('error', (error: Error) => {
      this.emit('protocolError', { protocol: protocol.name, error });
    });
  }

  /**
   * Handle discovered device from any protocol
   */
  private handleDiscoveredDevice(deviceInfo: DeviceInfo, protocolName: string): void {
    // Ignore self-discovery
    if (deviceInfo.deviceId === this.deviceInfo.deviceId) {
      return;
    }

    // Validate device info
    if (!this.isValidDeviceInfo(deviceInfo)) {
      console.warn('Invalid device info received:', deviceInfo);
      return;
    }

    const existingDevice = this.discoveredDevices.get(deviceInfo.deviceId);

    if (!existingDevice) {
      // New device discovered
      this.discoveredDevices.set(deviceInfo.deviceId, deviceInfo);
      this.emit('deviceDiscovered', {
        deviceInfo,
        discoveredVia: protocolName,
        firstSeen: true,
      });
    } else {
      // Update existing device info
      const updatedDevice = {
        ...existingDevice,
        ...deviceInfo,
        discoveredAt: Date.now(),
      };

      this.discoveredDevices.set(deviceInfo.deviceId, updatedDevice);
      this.emit('deviceUpdated', {
        deviceInfo: updatedDevice,
        discoveredVia: protocolName,
        firstSeen: false,
      });
    }
  }

  /**
   * Validate discovered device information
   */
  private isValidDeviceInfo(deviceInfo: DeviceInfo): boolean {
    return (
      typeof deviceInfo.deviceId === 'string' &&
      deviceInfo.deviceId.length > 0 &&
      typeof deviceInfo.deviceName === 'string' &&
      typeof deviceInfo.platform === 'string' &&
      ['ios', 'android'].includes(deviceInfo.platform) &&
      typeof deviceInfo.publicKey === 'string' &&
      deviceInfo.publicKey.length > 0 &&
      typeof deviceInfo.protocolVersion === 'string'
    );
  }

  /**
   * Get all discovered devices
   */
  getDiscoveredDevices(): DeviceInfo[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get specific discovered device
   */
  getDiscoveredDevice(deviceId: string): DeviceInfo | null {
    return this.discoveredDevices.get(deviceId) || null;
  }

  /**
   * Clear discovered devices
   */
  clearDiscoveredDevices(): void {
    this.discoveredDevices.clear();
    this.emit('devicesCleared');
  }

  /**
   * Get discovery status
   */
  getStatus(): {
    isDiscovering: boolean;
    isListening: boolean;
    supportedProtocols: string[];
    discoveredDevices: number;
  } {
    return {
      isDiscovering: this.isDiscovering,
      isListening: this.isListening,
      supportedProtocols: this.protocols.map(p => p.name),
      discoveredDevices: this.discoveredDevices.size,
    };
  }
}

/**
 * UDP Multicast Discovery Protocol
 * Primary discovery method for local network devices
 */
class UDPMulticastDiscovery extends EventEmitter implements DiscoveryProtocol {
  readonly name = 'UDP_MULTICAST';
  private config: P2PConnectionConfig;
  private socket: any = null; // dgram socket
  private multicastAddress = '239.255.255.250'; // UPnP multicast address

  constructor(config: P2PConnectionConfig) {
    super();
    this.config = config;
  }

  isSupported(): boolean {
    // UDP multicast supported on both iOS and Android
    return true;
  }

  async startAnnouncement(deviceInfo: DeviceInfo): Promise<void> {
    if (!this.socket) {
      await this.createSocket();
    }

    const announcement = {
      type: 'AURA_DEVICE_ANNOUNCEMENT',
      deviceInfo,
      timestamp: Date.now(),
    };

    const message = JSON.stringify(announcement);

    // Send multicast announcement
    this.socket?.send(message, this.config.discoveryPort, this.multicastAddress);
  }

  async stopAnnouncement(): Promise<void> {
    // UDP is stateless, no explicit stop needed
  }

  async startListening(): Promise<void> {
    if (!this.socket) {
      await this.createSocket();
    }

    this.socket?.on('message', (message: Buffer, rinfo: any) => {
      this.handleIncomingMessage(message, rinfo);
    });
  }

  async stopListening(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private async createSocket(): Promise<void> {
    // Implementation would use react-native-udp or similar
    // Mock implementation for now
    this.socket = {
      send: (message: string, port: number, address: string) => {
        // Mock UDP send
      },
      on: (event: string, callback: Function) => {
        // Mock event listener
      },
      close: () => {
        // Mock close
      },
    };
  }

  private handleIncomingMessage(message: Buffer, rinfo: any): void {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'AURA_DEVICE_ANNOUNCEMENT' && data.deviceInfo) {
        this.emit('deviceDiscovered', data.deviceInfo);
      }
    } catch (error) {
      // Ignore invalid messages
    }
  }
}

/**
 * mDNS/Bonjour Discovery Protocol
 * Apple ecosystem discovery method
 */
class MDNSDiscovery extends EventEmitter implements DiscoveryProtocol {
  readonly name = 'MDNS';
  private config: P2PConnectionConfig;

  constructor(config: P2PConnectionConfig) {
    super();
    this.config = config;
  }

  isSupported(): boolean {
    // mDNS primarily supported on iOS/macOS
    return true; // Would check platform capabilities
  }

  async startAnnouncement(deviceInfo: DeviceInfo): Promise<void> {
    // Implementation would use react-native-zeroconf or similar
    // Register mDNS service for Aura P2P
  }

  async stopAnnouncement(): Promise<void> {
    // Unregister mDNS service
  }

  async startListening(): Promise<void> {
    // Start browsing for Aura P2P services
  }

  async stopListening(): Promise<void> {
    // Stop browsing for services
  }
}

/**
 * Bluetooth Low Energy Discovery Protocol
 * Mobile-to-mobile discovery method
 */
class BLEDiscovery extends EventEmitter implements DiscoveryProtocol {
  readonly name = 'BLE';
  private config: P2PConnectionConfig;

  constructor(config: P2PConnectionConfig) {
    super();
    this.config = config;
  }

  isSupported(): boolean {
    // BLE supported on both iOS and Android
    return true; // Would check BLE capabilities
  }

  async startAnnouncement(deviceInfo: DeviceInfo): Promise<void> {
    // Implementation would use react-native-ble-manager
    // Advertise BLE service with device info in characteristics
  }

  async stopAnnouncement(): Promise<void> {
    // Stop BLE advertising
  }

  async startListening(): Promise<void> {
    // Start scanning for Aura BLE services
  }

  async stopListening(): Promise<void> {
    // Stop BLE scanning
  }
}

/**
 * WebRTC Local Network Discovery Protocol
 * Fallback discovery method using WebRTC
 */
class WebRTCDiscovery extends EventEmitter implements DiscoveryProtocol {
  readonly name = 'WEBRTC';
  private config: P2PConnectionConfig;

  constructor(config: P2PConnectionConfig) {
    super();
    this.config = config;
  }

  isSupported(): boolean {
    // WebRTC supported through React Native WebRTC
    return true; // Would check WebRTC capabilities
  }

  async startAnnouncement(deviceInfo: DeviceInfo): Promise<void> {
    // Implementation would use react-native-webrtc
    // Create peer connection for local network discovery
  }

  async stopAnnouncement(): Promise<void> {
    // Close peer connections
  }

  async startListening(): Promise<void> {
    // Start listening for WebRTC connections
  }

  async stopListening(): Promise<void> {
    // Stop WebRTC listening
  }
}
