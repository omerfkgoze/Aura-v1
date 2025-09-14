/**
 * Generate a cryptographically secure random ID
 */
export function generateId(): string {
  // Use crypto.getRandomValues for secure random generation
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a timestamp-based ID with random suffix
 */
export function generateTimestampId(): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = generateId().substring(0, 8);
  return `${timestamp}_${randomSuffix}`;
}

/**
 * Generate a UUID v4 compatible ID
 */
export function generateUUID(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  // Set version (4) and variant bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;

  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}
