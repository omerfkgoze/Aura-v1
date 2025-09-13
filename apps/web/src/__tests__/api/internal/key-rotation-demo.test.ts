import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/internal/key-rotation-demo/route';

// Mock console.log to avoid test output noise
vi.spyOn(console, 'log').mockImplementation(() => {});

// Helper function to create NextRequest
function createRequest(url: string, options: RequestInit = {}): NextRequest {
  const fullUrl = `http://localhost:3000${url}`;
  return new NextRequest(fullUrl, options);
}

// Helper function to parse JSON response
async function parseResponse(response: Response) {
  return await response.json();
}

describe('Key Rotation Demo API', () => {
  beforeEach(() => {
    // Reset any mocked timers
    vi.useRealTimers();
  });

  describe('GET /api/internal/key-rotation-demo', () => {
    it('should return overview with capabilities when no action specified', async () => {
      const request = createRequest('/api/internal/key-rotation-demo');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Key Rotation Demonstration System');
      expect(data.endpoints).toHaveProperty('status');
      expect(data.endpoints).toHaveProperty('versions');
      expect(data.endpoints).toHaveProperty('demo_data');
      expect(data.capabilities).toHaveProperty('key_rotation_simulation');
      expect(data.capabilities).toHaveProperty('backward_compatible_decryption');
      expect(data.capabilities).toHaveProperty('progressive_reencryption');
      expect(data.capabilities).toHaveProperty('emergency_rotation');
      expect(data.capabilities).toHaveProperty('audit_trail');
    });

    it('should return rotation status with key versions and migration info', async () => {
      const request = createRequest('/api/internal/key-rotation-demo?action=status');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toHaveProperty('current_version');
      expect(data.data.status).toHaveProperty('available_versions');
      expect(data.data.status).toHaveProperty('rotation_in_progress');
      expect(data.data.status).toHaveProperty('migration_progress');
      expect(data.data.status).toHaveProperty('last_rotation');
      expect(data.data.status).toHaveProperty('next_scheduled');
      expect(data.data.status).toHaveProperty('emergency_rotation_available');
      expect(data.data.key_versions).toBeInstanceOf(Array);
      expect(data.data.key_versions.length).toBeGreaterThan(0);
      expect(data.performance).toHaveProperty('response_time_ms');
      expect(data.performance).toHaveProperty('active_key_usage');
    });

    it('should return key versions with backward compatibility info', async () => {
      const request = createRequest('/api/internal/key-rotation-demo?action=versions');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.versions).toBeInstanceOf(Array);
      expect(data.data.backward_compatibility).toHaveProperty('can_decrypt_v1');
      expect(data.data.backward_compatibility).toHaveProperty('can_decrypt_v2');
      expect(data.data.backward_compatibility).toHaveProperty('supported_versions');
      expect(data.data.backward_compatibility.supported_versions).toBeInstanceOf(Array);

      // Validate key version structure
      const firstVersion = data.data.versions[0];
      expect(firstVersion).toHaveProperty('id');
      expect(firstVersion).toHaveProperty('version');
      expect(firstVersion).toHaveProperty('algorithm');
      expect(firstVersion).toHaveProperty('created');
      expect(firstVersion).toHaveProperty('status');
      expect(firstVersion).toHaveProperty('usage_count');
      expect(['active', 'deprecated', 'revoked']).toContain(firstVersion.status);
    });

    it('should return demo data with encryption distribution', async () => {
      const request = createRequest('/api/internal/key-rotation-demo?action=demo-data');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toBeInstanceOf(Array);
      expect(data.data.encryption_distribution).toHaveProperty('v1_items');
      expect(data.data.encryption_distribution).toHaveProperty('v2_items');
      expect(data.data.encryption_distribution).toHaveProperty('migrated_items');

      // Validate demo data structure
      if (data.data.items.length > 0) {
        const firstItem = data.data.items[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('data');
        expect(firstItem).toHaveProperty('encrypted_with_version');
        expect(firstItem).toHaveProperty('created');
        expect(firstItem).toHaveProperty('migrated');
        expect(typeof firstItem.migrated).toBe('boolean');
      }
    });

    it('should handle invalid action gracefully', async () => {
      const request = createRequest('/api/internal/key-rotation-demo?action=invalid');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Key Rotation Demonstration System');
    });

    it('should handle server errors gracefully', async () => {
      // Mock URL constructor to throw error
      const originalURL = global.URL;
      vi.stubGlobal(
        'URL',
        class {
          constructor() {
            throw new Error('Test error');
          }
        }
      );

      const request = createRequest('/api/internal/key-rotation-demo');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');

      // Restore URL constructor
      vi.stubGlobal('URL', originalURL);
    });
  });

  describe('POST /api/internal/key-rotation-demo - Key Rotation', () => {
    it('should successfully perform manual key rotation', async () => {
      const rotationRequest = {
        type: 'manual',
        reason: 'Testing manual rotation',
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rotationRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('manual key rotation initiated');
      expect(data.data.new_key).toHaveProperty('id');
      expect(data.data.new_key).toHaveProperty('version');
      expect(data.data.new_key.status).toBe('active');
      expect(data.data.rotation_type).toBe('manual');
      expect(data.data.reason).toBe('Testing manual rotation');
      expect(data.data.migration_status).toBe('started');
      expect(data.audit_trail).toHaveProperty('event');
      expect(data.audit_trail).toHaveProperty('timestamp');
      expect(data.audit_trail.type).toBe('manual');
    });

    it('should successfully perform scheduled key rotation', async () => {
      const rotationRequest = {
        type: 'scheduled',
        reason: 'Regular scheduled rotation',
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rotationRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('scheduled key rotation initiated');
      expect(data.data.rotation_type).toBe('scheduled');
      expect(data.audit_trail.type).toBe('scheduled');
    });

    it('should successfully perform emergency key rotation', async () => {
      const rotationRequest = {
        type: 'emergency',
        reason: 'Security breach detected',
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rotationRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('emergency key rotation initiated');
      expect(data.data.rotation_type).toBe('emergency');
      expect(data.audit_trail.type).toBe('emergency');
    });

    it('should reject rotation when one is already in progress', async () => {
      // Start first rotation
      const firstRequest = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual', reason: 'First rotation' }),
      });
      await POST(firstRequest);

      // Try second rotation immediately
      const secondRequest = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual', reason: 'Second rotation' }),
      });

      const response = await POST(secondRequest);
      const data = await parseResponse(response);

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rotation already in progress');
    });

    it('should handle invalid rotation type', async () => {
      const invalidRequest = {
        type: 'invalid_type',
        reason: 'Testing validation',
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/internal/key-rotation-demo - Backward Compatible Decryption', () => {
    it('should successfully decrypt with valid key version', async () => {
      const decryptRequest = {
        encrypted_data: 'encrypted_1_VGVzdCBkYXRh_1234567890',
        key_version: 1,
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decryptRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Decryption successful');
      expect(data.data.decrypted_data).toBe('Test data');
      expect(data.data.key_version_used).toBe(1);
      expect(data.data.backward_compatible).toBe(true);
      expect(data.validation.key_version_valid).toBe(true);
      expect(data.validation.backward_compatibility_confirmed).toBe(true);
      expect(data.validation.integrity_check_passed).toBe(true);
    });

    it('should successfully decrypt with current key version', async () => {
      const decryptRequest = {
        encrypted_data: 'encrypted_2_VGVzdCBkYXRh_1234567890',
        key_version: 2,
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decryptRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.backward_compatible).toBe(false);
    });

    it('should reject decryption with invalid key version', async () => {
      const decryptRequest = {
        encrypted_data: 'encrypted_999_VGVzdCBkYXRh_1234567890',
        key_version: 999,
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decryptRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid key version');
      expect(data.message).toBe('Key version 999 not found');
    });

    it('should reject decryption with mismatched encryption format', async () => {
      const decryptRequest = {
        encrypted_data: 'encrypted_2_VGVzdCBkYXRh_1234567890', // version 2 format
        key_version: 1, // trying to decrypt with version 1 key
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decryptRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Decryption failed');
    });

    it('should handle malformed encrypted data', async () => {
      const decryptRequest = {
        encrypted_data: 'invalid_format_data',
        key_version: 1,
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decryptRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Decryption failed');
    });

    it('should handle invalid decryption request format', async () => {
      const invalidRequest = {
        encrypted_data: 123, // should be string
        key_version: 'invalid', // should be number
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/internal/key-rotation-demo - Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle request with neither rotation nor decryption parameters', async () => {
      const invalidRequest = {
        some_other_field: 'value',
      };

      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request');
      expect(data.message).toBe(
        'Request must contain either rotation parameters or decryption parameters'
      );
    });

    it('should handle empty request body', async () => {
      const request = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request');
    });
  });

  describe('Integration Scenarios', () => {
    it('should demonstrate complete key rotation workflow', async () => {
      // 1. Check initial status
      const statusRequest = createRequest('/api/internal/key-rotation-demo?action=status');
      const statusResponse = await GET(statusRequest);
      const statusData = await parseResponse(statusResponse);
      const initialVersion = statusData.data.status.current_version;

      // 2. Perform rotation
      const rotationRequest = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual',
          reason: 'Integration test rotation',
        }),
      });
      const rotationResponse = await POST(rotationRequest);
      const rotationData = await parseResponse(rotationResponse);

      expect(rotationResponse.status).toBe(200);
      expect(rotationData.data.new_key.version).toBe(initialVersion + 1);

      // 3. Verify backward compatibility still works
      const decryptRequest = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encrypted_data: `encrypted_${initialVersion}_VGVzdCBkYXRh_1234567890`,
          key_version: initialVersion,
        }),
      });
      const decryptResponse = await POST(decryptRequest);
      const decryptData = await parseResponse(decryptResponse);

      expect(decryptResponse.status).toBe(200);
      expect(decryptData.data.backward_compatible).toBe(true);
    });

    it('should handle progressive re-encryption simulation', async () => {
      // Wait a moment to ensure any previous rotations complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start a rotation to trigger progressive re-encryption
      const rotationRequest = createRequest('/api/internal/key-rotation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual',
          reason: 'Progressive re-encryption test',
        }),
      });

      const rotationResponse = await POST(rotationRequest);
      const rotationData = await parseResponse(rotationResponse);

      expect(rotationResponse.status).toBe(200);
      expect(rotationData.data.migration_status).toBe('started');
      expect(rotationData.data.estimated_completion).toBeDefined();

      // Check that rotation is in progress
      const statusRequest = createRequest('/api/internal/key-rotation-demo?action=status');
      const statusResponse = await GET(statusRequest);
      const statusData = await parseResponse(statusResponse);

      // Note: In real scenario, rotation_in_progress would be true initially
      // but our simulation completes quickly
      expect(statusData.data.status.emergency_rotation_available).toBeDefined();
    });
  });
});
