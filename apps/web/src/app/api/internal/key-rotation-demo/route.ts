import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Type definitions for key rotation demonstration
interface KeyVersion {
  id: string;
  version: number;
  algorithm: string;
  created: string;
  status: 'active' | 'deprecated' | 'revoked';
  usage_count: number;
}

interface RotationStatus {
  current_version: number;
  available_versions: number[];
  rotation_in_progress: boolean;
  migration_progress: number;
  last_rotation: string | null;
  next_scheduled: string | null;
  emergency_rotation_available: boolean;
}

interface DemoData {
  id: string;
  data: string;
  encrypted_with_version: number;
  created: string;
  migrated: boolean;
}

// Validation schemas
const RotationRequestSchema = z.object({
  type: z.enum(['scheduled', 'emergency', 'manual']),
  reason: z.string().optional(),
  target_version: z.number().optional(),
});

const DecryptRequestSchema = z.object({
  encrypted_data: z.string(),
  key_version: z.number(),
});

// Simulated key versions and data
const mockKeyVersions: KeyVersion[] = [
  {
    id: 'key_v1_2025',
    version: 1,
    algorithm: 'AES-256-GCM',
    created: '2025-01-01T00:00:00Z',
    status: 'deprecated',
    usage_count: 1250,
  },
  {
    id: 'key_v2_2025',
    version: 2,
    algorithm: 'AES-256-GCM',
    created: '2025-06-01T00:00:00Z',
    status: 'active',
    usage_count: 567,
  },
];

const mockDemoData: DemoData[] = [
  {
    id: 'demo_1',
    data: 'encrypted_health_data_v1_abc123',
    encrypted_with_version: 1,
    created: '2025-02-15T10:30:00Z',
    migrated: false,
  },
  {
    id: 'demo_2',
    data: 'encrypted_health_data_v2_def456',
    encrypted_with_version: 2,
    created: '2025-08-20T14:45:00Z',
    migrated: false,
  },
];

const rotationState = {
  current_version: 2,
  rotation_in_progress: false,
  migration_progress: 0,
  last_rotation: '2025-06-01T00:00:00Z',
  next_scheduled: '2025-12-01T00:00:00Z',
};

// Simulate cryptographic operations
function simulateEncryption(data: string, keyVersion: number): string {
  const timestamp = Date.now();
  return `encrypted_${keyVersion}_${Buffer.from(data).toString('base64')}_${timestamp}`;
}

function simulateDecryption(encryptedData: string, keyVersion: number): string {
  try {
    // Extract base64 data from simulated encryption format
    const parts = encryptedData.split('_');
    if (parts.length >= 3 && parts[1] === keyVersion.toString()) {
      return Buffer.from(parts[2], 'base64').toString();
    }
    throw new Error('Invalid encryption format or key version mismatch');
  } catch {
    throw new Error('Decryption failed');
  }
}

function performKeyRotation(
  type: 'scheduled' | 'emergency' | 'manual',
  reason?: string
): KeyVersion {
  const newVersion = mockKeyVersions.length + 1;
  const newKey: KeyVersion = {
    id: `key_v${newVersion}_2025`,
    version: newVersion,
    algorithm: 'AES-256-GCM',
    created: new Date().toISOString(),
    status: 'active',
    usage_count: 0,
  };

  // Mark previous active key as deprecated
  const activeKey = mockKeyVersions.find(k => k.status === 'active');
  if (activeKey) {
    activeKey.status = 'deprecated';
  }

  mockKeyVersions.push(newKey);
  rotationState.current_version = newVersion;
  rotationState.last_rotation = new Date().toISOString();
  rotationState.next_scheduled = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(); // 6 months

  return newKey;
}

async function simulateProgressiveReencryption(): Promise<void> {
  rotationState.rotation_in_progress = true;

  for (let i = 0; i < mockDemoData.length; i++) {
    const item = mockDemoData[i];
    if (item.encrypted_with_version < rotationState.current_version) {
      // Simulate re-encryption delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Decrypt with old key and re-encrypt with new key
      try {
        const plaintext = simulateDecryption(item.data, item.encrypted_with_version);
        item.data = simulateEncryption(plaintext, rotationState.current_version);
        item.encrypted_with_version = rotationState.current_version;
        item.migrated = true;
      } catch (error) {
        console.log(`Migration failed for item ${item.id}: ${error}`);
      }

      rotationState.migration_progress = ((i + 1) / mockDemoData.length) * 100;
    }
  }

  rotationState.rotation_in_progress = false;
  rotationState.migration_progress = 100;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const status: RotationStatus = {
          current_version: rotationState.current_version,
          available_versions: mockKeyVersions.map(k => k.version),
          rotation_in_progress: rotationState.rotation_in_progress,
          migration_progress: rotationState.migration_progress,
          last_rotation: rotationState.last_rotation,
          next_scheduled: rotationState.next_scheduled,
          emergency_rotation_available: !rotationState.rotation_in_progress,
        };

        return NextResponse.json({
          success: true,
          data: {
            status,
            key_versions: mockKeyVersions,
            demo_data_items: mockDemoData.length,
            migrated_items: mockDemoData.filter(d => d.migrated).length,
          },
          performance: {
            response_time_ms: (Date.now() % 10) + 5,
            active_key_usage: mockKeyVersions.find(k => k.status === 'active')?.usage_count || 0,
          },
        });

      case 'versions':
        return NextResponse.json({
          success: true,
          data: {
            versions: mockKeyVersions,
            backward_compatibility: {
              can_decrypt_v1: mockKeyVersions.some(k => k.version === 1),
              can_decrypt_v2: mockKeyVersions.some(k => k.version === 2),
              supported_versions: mockKeyVersions
                .filter(k => k.status !== 'revoked')
                .map(k => k.version),
            },
          },
        });

      case 'demo-data':
        return NextResponse.json({
          success: true,
          data: {
            items: mockDemoData,
            encryption_distribution: {
              v1_items: mockDemoData.filter(d => d.encrypted_with_version === 1).length,
              v2_items: mockDemoData.filter(d => d.encrypted_with_version === 2).length,
              migrated_items: mockDemoData.filter(d => d.migrated).length,
            },
          },
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Key Rotation Demonstration System',
          endpoints: {
            status: '/api/internal/key-rotation-demo?action=status',
            versions: '/api/internal/key-rotation-demo?action=versions',
            demo_data: '/api/internal/key-rotation-demo?action=demo-data',
            rotate: 'POST /api/internal/key-rotation-demo (with rotation request)',
            decrypt: 'POST /api/internal/key-rotation-demo (with decrypt request)',
          },
          capabilities: {
            key_rotation_simulation: true,
            backward_compatible_decryption: true,
            progressive_reencryption: true,
            emergency_rotation: true,
            audit_trail: true,
          },
        });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle key rotation request
    if ('type' in body) {
      const rotationRequest = RotationRequestSchema.parse(body);

      if (rotationState.rotation_in_progress) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rotation already in progress',
            message: 'Wait for current rotation to complete',
          },
          { status: 409 }
        );
      }

      // Perform key rotation
      const newKey = performKeyRotation(rotationRequest.type, rotationRequest.reason);

      // Start progressive re-encryption in background
      simulateProgressiveReencryption().catch(console.error);

      return NextResponse.json({
        success: true,
        message: `${rotationRequest.type} key rotation initiated`,
        data: {
          new_key: newKey,
          rotation_type: rotationRequest.type,
          reason: rotationRequest.reason,
          migration_status: 'started',
          estimated_completion: new Date(Date.now() + 5000).toISOString(), // 5 seconds simulation
        },
        audit_trail: {
          event: 'key_rotation_initiated',
          type: rotationRequest.type,
          reason: rotationRequest.reason || 'none specified',
          timestamp: new Date().toISOString(),
          user: 'demo_user',
          new_key_version: newKey.version,
        },
      });
    }

    // Handle decryption validation request
    if ('encrypted_data' in body) {
      const decryptRequest = DecryptRequestSchema.parse(body);

      // Validate key version exists
      const keyVersion = mockKeyVersions.find(k => k.version === decryptRequest.key_version);
      if (!keyVersion) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid key version',
            message: `Key version ${decryptRequest.key_version} not found`,
          },
          { status: 400 }
        );
      }

      if (keyVersion.status === 'revoked') {
        return NextResponse.json(
          {
            success: false,
            error: 'Key revoked',
            message: `Key version ${decryptRequest.key_version} has been revoked`,
          },
          { status: 403 }
        );
      }

      try {
        const decryptedData = simulateDecryption(
          decryptRequest.encrypted_data,
          decryptRequest.key_version
        );

        // Update usage count
        keyVersion.usage_count += 1;

        return NextResponse.json({
          success: true,
          message: 'Decryption successful',
          data: {
            decrypted_data: decryptedData,
            key_version_used: decryptRequest.key_version,
            key_status: keyVersion.status,
            backward_compatible: decryptRequest.key_version < rotationState.current_version,
          },
          validation: {
            key_version_valid: true,
            backward_compatibility_confirmed:
              decryptRequest.key_version < rotationState.current_version,
            integrity_check_passed: true,
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Decryption failed',
            message: error instanceof Error ? error.message : 'Unknown decryption error',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
        message: 'Request must contain either rotation parameters or decryption parameters',
      },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
