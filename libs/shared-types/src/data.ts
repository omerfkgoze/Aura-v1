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

// Flow intensity levels
export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

// Symptom categories
export type SymptomCategory =
  | 'mood'
  | 'physical'
  | 'energy'
  | 'sleep'
  | 'skin'
  | 'digestive'
  | 'custom';

// Predefined symptoms
export interface Symptom {
  id: string;
  name: string;
  category: SymptomCategory;
  severity?: 1 | 2 | 3 | 4 | 5; // 1 = mild, 5 = severe
}

// Period day data
export interface PeriodDayData {
  date: string; // ISO date string
  flowIntensity: FlowIntensity;
  symptoms: Symptom[];
  notes?: string;
  isPeriodStart?: boolean;
  isPeriodEnd?: boolean;
}

// Complete cycle data
export interface EncryptedCycleData {
  id: string;
  userId: string;
  cycleNumber: number;
  periodStartDate: string;
  periodEndDate?: string;
  expectedNextPeriod?: string;
  dayData: PeriodDayData[];
  version: number;
  deviceId: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
  modificationHistory: ModificationRecord[];
}

// Modification tracking for audit trail
export interface ModificationRecord {
  id: string;
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  deviceId: string;
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
