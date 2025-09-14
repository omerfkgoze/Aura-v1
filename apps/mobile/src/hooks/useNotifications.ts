import { useState, useEffect, useCallback } from 'react';

export interface NotificationOptions {
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high';
  category?: string;
  data?: Record<string, any>;
  scheduledTime?: Date;
  sound?: boolean;
  vibration?: boolean;
  badge?: number;
}

export interface NotificationPermissions {
  status: 'granted' | 'denied' | 'not-determined';
  sound: boolean;
  alert: boolean;
  badge: boolean;
  provisional: boolean;
}

export interface UseNotificationsReturn {
  permissions: NotificationPermissions;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  scheduleNotification: (options: NotificationOptions) => Promise<string>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  getScheduledNotifications: () => Promise<NotificationOptions[]>;
  showLocalNotification: (options: NotificationOptions) => Promise<void>;
  registerForPushNotifications: () => Promise<string | null>;
  unregisterFromPushNotifications: () => Promise<void>;
  showNotification: (options: NotificationOptions) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permissions, setPermissions] = useState<NotificationPermissions>({
    status: 'not-determined',
    sound: false,
    alert: false,
    badge: false,
    provisional: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, this would use react-native-push-notification or similar
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();

        const newPermissions: NotificationPermissions = {
          status: permission === 'granted' ? 'granted' : 'denied',
          sound: permission === 'granted',
          alert: permission === 'granted',
          badge: permission === 'granted',
          provisional: false,
        };

        setPermissions(newPermissions);
        return permission === 'granted';
      }

      // Simulate mobile permissions
      setPermissions({
        status: 'granted',
        sound: true,
        alert: true,
        badge: true,
        provisional: false,
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permissions');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleNotification = useCallback(
    async (options: NotificationOptions): Promise<string> => {
      if (permissions.status !== 'granted') {
        throw new Error('Notification permissions not granted');
      }

      // Generate notification ID
      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In a real implementation, this would schedule the notification
      console.log('Scheduling notification:', { id, ...options });

      return id;
    },
    [permissions.status]
  );

  const cancelNotification = useCallback(async (id: string): Promise<void> => {
    // In a real implementation, this would cancel the notification
    console.log('Cancelling notification:', id);
  }, []);

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    // In a real implementation, this would cancel all notifications
    console.log('Cancelling all notifications');
  }, []);

  const getScheduledNotifications = useCallback(async (): Promise<NotificationOptions[]> => {
    // In a real implementation, this would return scheduled notifications
    return [];
  }, []);

  const showLocalNotification = useCallback(
    async (options: NotificationOptions): Promise<void> => {
      if (permissions.status !== 'granted') {
        throw new Error('Notification permissions not granted');
      }

      // For web, use browser notifications
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification(options.title, {
          body: options.body,
          data: options.data,
          badge: options.badge ? '/icon-192x192.png' : undefined,
          silent: !options.sound,
        });
        return;
      }

      // For mobile, this would use react-native push notification
      console.log('Showing local notification:', options);
    },
    [permissions.status]
  );

  const showNotification = useCallback(
    async (options: NotificationOptions): Promise<void> => {
      // Alias for showLocalNotification for backward compatibility
      return showLocalNotification(options);
    },
    [showLocalNotification]
  );

  const showToast = useCallback(
    async (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info'
    ): Promise<void> => {
      // Show a toast notification
      await showLocalNotification({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        body: message,
        priority: type === 'error' ? 'high' : 'normal',
        sound: type === 'error',
        vibration: type === 'error',
      });
    },
    [showLocalNotification]
  );

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, this would register with FCM/APNS
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return mock token
      return `push_token_${Date.now()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register for push notifications');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unregisterFromPushNotifications = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, this would unregister from push notifications
      await new Promise(resolve => setTimeout(resolve, 500));

      setPermissions(prev => ({
        ...prev,
        status: 'not-determined',
        sound: false,
        alert: false,
        badge: false,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unregister from push notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check initial permission status
    const checkPermissions = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission;
        setPermissions({
          status:
            permission === 'granted'
              ? 'granted'
              : permission === 'denied'
                ? 'denied'
                : 'not-determined',
          sound: permission === 'granted',
          alert: permission === 'granted',
          badge: permission === 'granted',
          provisional: false,
        });
      }
    };

    checkPermissions();
  }, []);

  return {
    permissions,
    isLoading,
    error,
    requestPermissions,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    getScheduledNotifications,
    showLocalNotification,
    registerForPushNotifications,
    unregisterFromPushNotifications,
    showNotification,
    showToast,
  };
};
