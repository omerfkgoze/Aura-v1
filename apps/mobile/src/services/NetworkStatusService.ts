import { NetworkState, NetInfo, NetInfoState } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';

/**
 * Network status monitoring service for offline-first design
 * Provides network state detection and connectivity change notifications
 */
export class NetworkStatusService extends EventEmitter {
  private currentState: NetInfoState | null = null;
  private isOnline: boolean = false;
  private isInitialized: boolean = false;
  private connectivityHistory: Array<{ timestamp: number; isConnected: boolean }> = [];
  private reachabilityTestInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize network monitoring with intelligent detection
   */
  private async initialize(): Promise<void> {
    try {
      // Get initial network state
      this.currentState = await NetInfo.fetch();
      this.isOnline = this.determineConnectivity(this.currentState);

      // Subscribe to network state changes
      NetInfo.addEventListener((state: NetInfoState) => {
        this.handleNetworkStateChange(state);
      });

      // Start periodic reachability testing for enhanced accuracy
      this.startReachabilityTesting();

      this.isInitialized = true;
      this.emit('initialized', { isOnline: this.isOnline });
    } catch (error) {
      console.error('[NetworkStatusService] Initialization failed:', error);
      // Assume offline on initialization failure
      this.isOnline = false;
      this.isInitialized = true;
      this.emit('initialized', { isOnline: false });
    }
  }

  /**
   * Intelligent connectivity determination
   * Considers connection type, strength, and reachability
   */
  private determineConnectivity(state: NetInfoState): boolean {
    if (!state) return false;

    // Primary check: is connected
    if (!state.isConnected) return false;

    // Secondary check: internet reachable
    if (state.isInternetReachable === false) return false;

    // Tertiary check: connection quality for mobile networks
    if (state.type === 'cellular' && state.details) {
      const cellularDetails = state.details as any;
      // Consider very poor cellular connections as offline
      if (cellularDetails.strength && cellularDetails.strength < 20) {
        return false;
      }
    }

    // WiFi specific checks
    if (state.type === 'wifi' && state.details) {
      const wifiDetails = state.details as any;
      // Check signal strength if available
      if (wifiDetails.strength && wifiDetails.strength < 25) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle network state changes with debouncing
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    const previousState = this.currentState;
    const previousOnlineStatus = this.isOnline;

    this.currentState = state;
    this.isOnline = this.determineConnectivity(state);

    // Add to connectivity history
    this.connectivityHistory.push({
      timestamp: Date.now(),
      isConnected: this.isOnline,
    });

    // Keep only last 50 connectivity events
    if (this.connectivityHistory.length > 50) {
      this.connectivityHistory = this.connectivityHistory.slice(-50);
    }

    // Emit events only on actual status changes
    if (previousOnlineStatus !== this.isOnline) {
      if (this.isOnline) {
        this.emit('online', {
          state,
          previousState,
          connectivityRestored: true,
          downtime: this.calculateLastDowntime(),
        });
      } else {
        this.emit('offline', {
          state,
          previousState,
          connectivityLost: true,
        });
      }
    }

    // Always emit state change for detailed monitoring
    this.emit('stateChange', {
      current: state,
      previous: previousState,
      isOnline: this.isOnline,
      wasOnline: previousOnlineStatus,
    });
  }

  /**
   * Enhanced reachability testing for accurate connectivity detection
   */
  private startReachabilityTesting(): void {
    // Test connectivity every 30 seconds when online, every 10 seconds when offline
    const testConnectivity = async () => {
      if (!this.currentState) return;

      try {
        const testResult = await NetInfo.fetch();
        const actualConnectivity = this.determineConnectivity(testResult);

        // If our current status differs from test result, update
        if (actualConnectivity !== this.isOnline) {
          this.handleNetworkStateChange(testResult);
        }
      } catch (error) {
        // Test failed, consider offline
        if (this.isOnline) {
          const offlineState: NetInfoState = {
            ...this.currentState!,
            isConnected: false,
            isInternetReachable: false,
          };
          this.handleNetworkStateChange(offlineState);
        }
      }
    };

    this.reachabilityTestInterval = setInterval(testConnectivity, this.isOnline ? 30000 : 10000);
  }

  /**
   * Calculate downtime duration from connectivity history
   */
  private calculateLastDowntime(): number {
    if (this.connectivityHistory.length < 2) return 0;

    const events = this.connectivityHistory.slice().reverse();
    let downtime = 0;
    let disconnectTime: number | null = null;

    for (const event of events) {
      if (!event.isConnected && disconnectTime === null) {
        // Found most recent disconnect
        continue;
      } else if (!event.isConnected && disconnectTime === null) {
        disconnectTime = event.timestamp;
      } else if (event.isConnected && disconnectTime !== null) {
        // Found reconnect after disconnect
        downtime = disconnectTime - event.timestamp;
        break;
      }
    }

    return downtime;
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): {
    isOnline: boolean;
    state: NetInfoState | null;
    isInitialized: boolean;
    connectionType: string;
    signalStrength?: number;
  } {
    return {
      isOnline: this.isOnline,
      state: this.currentState,
      isInitialized: this.isInitialized,
      connectionType: this.currentState?.type || 'unknown',
      signalStrength: this.getSignalStrength(),
    };
  }

  /**
   * Get signal strength if available
   */
  private getSignalStrength(): number | undefined {
    if (!this.currentState?.details) return undefined;

    const details = this.currentState.details as any;
    return details.strength;
  }

  /**
   * Check if network is suitable for large data transfers
   */
  public isSuitableForLargeTransfers(): boolean {
    if (!this.isOnline || !this.currentState) return false;

    // WiFi is generally suitable
    if (this.currentState.type === 'wifi') return true;

    // Check cellular data restrictions
    if (this.currentState.type === 'cellular') {
      const details = this.currentState.details as any;

      // Avoid large transfers on very slow connections
      if (details.cellularGeneration === '2g') return false;

      // Check signal strength for cellular
      if (details.strength && details.strength < 50) return false;
    }

    return true;
  }

  /**
   * Get connectivity reliability score (0-100)
   */
  public getConnectivityReliability(): number {
    if (this.connectivityHistory.length < 10) return 50; // Default score

    const recentEvents = this.connectivityHistory.slice(-20);
    const connectedEvents = recentEvents.filter(event => event.isConnected);

    const reliability = (connectedEvents.length / recentEvents.length) * 100;
    return Math.round(reliability);
  }

  /**
   * Wait for network connectivity
   */
  public async waitForConnectivity(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isOnline) return true;

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        this.removeListener('online', onlineHandler);
        resolve(false);
      }, timeoutMs);

      const onlineHandler = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      this.once('online', onlineHandler);
    });
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.removeAllListeners();

    if (this.reachabilityTestInterval) {
      clearInterval(this.reachabilityTestInterval);
      this.reachabilityTestInterval = null;
    }
  }
}

export const networkStatusService = new NetworkStatusService();
