// Common utility types

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export type Status = 'active' | 'inactive' | 'pending' | 'archived';

export interface BaseEntity extends Timestamps {
  id: string;
  status: Status;
}