// Data model types

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  stealthMode: boolean;
}

export interface CycleData {
  id: string;
  userId: string;
  date: string;
  encryptedData: string; // Client-side encrypted health data
  version: number;
  createdAt: string;
  updatedAt: string;
}
