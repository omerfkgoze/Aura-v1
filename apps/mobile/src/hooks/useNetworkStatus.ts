import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isInternetReachable: boolean;
  strength: number; // 0-100
}

export interface UseNetworkStatusReturn {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string;
  refreshNetworkStatus: () => Promise<void>;
}

export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
    strength: 100,
  });

  useEffect(() => {
    // In a real implementation, this would use @react-native-community/netinfo
    const checkNetworkStatus = async () => {
      try {
        // Simulate network check
        const status: NetworkStatus = {
          isConnected: navigator.onLine ?? true,
          type: 'wifi',
          isInternetReachable: navigator.onLine ?? true,
          strength: 85,
        };
        setNetworkStatus(status);
      } catch (error) {
        console.error('Failed to check network status:', error);
        setNetworkStatus({
          isConnected: false,
          type: 'none',
          isInternetReachable: false,
          strength: 0,
        });
      }
    };

    checkNetworkStatus();

    // Set up network status listeners
    const handleOnline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        strength: 85,
      }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        strength: 0,
      }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Return empty cleanup function for non-browser environments
    return () => {};
  }, []);

  const refreshNetworkStatus = async () => {
    try {
      const status: NetworkStatus = {
        isConnected: navigator.onLine ?? true,
        type: 'wifi',
        isInternetReachable: navigator.onLine ?? true,
        strength: Math.floor(Math.random() * 40) + 60, // 60-100
      };
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to refresh network status:', error);
    }
  };

  return {
    networkStatus,
    isOnline: networkStatus.isConnected,
    isOffline: !networkStatus.isConnected,
    connectionType: networkStatus.type,
    refreshNetworkStatus,
  };
};
