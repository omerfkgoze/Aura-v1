/**
 * Type declarations for optional dependencies
 */
declare module '@react-native-async-storage/async-storage' {
  interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

declare module 'react-native' {
  interface PlatformStatic {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  }
  export const Platform: PlatformStatic;
}
