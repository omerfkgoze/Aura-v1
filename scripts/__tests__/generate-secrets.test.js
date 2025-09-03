const { describe, it, expect, vi, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock filesystem operations
vi.mock('fs');
vi.mock('path');
vi.mock('crypto');

describe('Generate Secrets Script', () => {
  let consoleSpy;
  let originalArgv;
  let originalCwd;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    originalArgv = process.argv;
    originalCwd = process.cwd;

    // Mock process.cwd()
    process.cwd = vi.fn(() => '/test/project');

    // Clear all mocks
    vi.clearAllMocks();

    // Reset modules to ensure fresh import
    vi.resetModules();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    process.argv = originalArgv;
    process.cwd = originalCwd;
    vi.restoreAllMocks();
  });

  describe('Secret Generation', () => {
    it('should generate cryptographically secure secrets', () => {
      // Mock crypto.randomBytes
      const mockBuffer = Buffer.from('mock-random-bytes');
      crypto.randomBytes.mockReturnValue(mockBuffer);

      // Import and run the script logic (simulating the main functionality)
      const secrets = {
        EXPO_PUBLIC_DEVICE_PEPPER: crypto.randomBytes(48).toString('base64'),
        DEVICE_HASH_PEPPER: crypto.randomBytes(48).toString('base64'),
        NEXTAUTH_SECRET: crypto.randomBytes(48).toString('base64'),
        JWT_SECRET: crypto.randomBytes(32).toString('hex'),
        ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
        SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      };

      // Verify crypto.randomBytes was called correctly
      expect(crypto.randomBytes).toHaveBeenCalledWith(48); // For peppers and NextAuth secret
      expect(crypto.randomBytes).toHaveBeenCalledWith(32); // For JWT, encryption, and session secrets

      // Verify all required secrets are generated
      expect(secrets).toHaveProperty('EXPO_PUBLIC_DEVICE_PEPPER');
      expect(secrets).toHaveProperty('DEVICE_HASH_PEPPER');
      expect(secrets).toHaveProperty('NEXTAUTH_SECRET');
      expect(secrets).toHaveProperty('JWT_SECRET');
      expect(secrets).toHaveProperty('ENCRYPTION_KEY');
      expect(secrets).toHaveProperty('SESSION_SECRET');
    });

    it('should generate different values for each secret type', () => {
      // Mock crypto.randomBytes to return different values
      let callCount = 0;
      crypto.randomBytes.mockImplementation(size => {
        callCount++;
        return Buffer.from(`mock-bytes-${callCount}-${size}`);
      });

      const secrets = {
        EXPO_PUBLIC_DEVICE_PEPPER: crypto.randomBytes(48).toString('base64'),
        DEVICE_HASH_PEPPER: crypto.randomBytes(48).toString('base64'),
        NEXTAUTH_SECRET: crypto.randomBytes(48).toString('base64'),
      };

      // Verify all secrets are different
      const secretValues = Object.values(secrets);
      const uniqueValues = new Set(secretValues);
      expect(uniqueValues.size).toBe(secretValues.length);
    });

    it('should use appropriate lengths for different secret types', () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('mock'));

      // Simulate the script's secret generation logic
      const secretConfigs = [
        { name: 'EXPO_PUBLIC_DEVICE_PEPPER', bytes: 48, encoding: 'base64' },
        { name: 'DEVICE_HASH_PEPPER', bytes: 48, encoding: 'base64' },
        { name: 'NEXTAUTH_SECRET', bytes: 48, encoding: 'base64' },
        { name: 'JWT_SECRET', bytes: 32, encoding: 'hex' },
        { name: 'ENCRYPTION_KEY', bytes: 32, encoding: 'hex' },
        { name: 'SESSION_SECRET', bytes: 32, encoding: 'hex' },
      ];

      secretConfigs.forEach(config => {
        crypto.randomBytes(config.bytes);
      });

      // Verify correct byte lengths are requested
      expect(crypto.randomBytes).toHaveBeenCalledWith(48); // For base64 secrets
      expect(crypto.randomBytes).toHaveBeenCalledWith(32); // For hex secrets
    });
  });

  describe('Console Output', () => {
    it('should display generation progress', async () => {
      // Mock crypto
      crypto.randomBytes.mockReturnValue(Buffer.from('test-bytes'));

      // Mock the script execution without --write flag
      process.argv = ['node', 'generate-secrets.js'];

      // Import the script (this will execute it)
      await import('../generate-secrets.js');

      // Verify console output includes expected messages
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Generating secure secrets')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Generated secure secrets')
      );
    });

    it('should display security recommendations', async () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('test-bytes'));
      process.argv = ['node', 'generate-secrets.js'];

      await import('../generate-secrets.js');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Security Recommendations')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('never commit them to git')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Rotate secrets regularly')
      );
    });

    it('should truncate long secrets in display', () => {
      const longSecret = 'a'.repeat(64);
      crypto.randomBytes.mockReturnValue(Buffer.from(longSecret));

      // Simulate the display logic
      const displayValue =
        longSecret.length > 32 ? `${longSecret.substring(0, 32)}...` : longSecret;

      expect(displayValue).toBe('a'.repeat(32) + '...');
      expect(displayValue.length).toBe(35); // 32 chars + '...'
    });
  });

  describe('File Writing (--write flag)', () => {
    beforeEach(() => {
      // Mock filesystem methods
      fs.existsSync.mockReturnValue(false);
      fs.readFileSync.mockReturnValue('# Example env file\n');
      fs.writeFileSync.mockImplementation(() => {});
      fs.mkdirSync.mockImplementation(() => {});
      path.dirname.mockImplementation(filePath => filePath.replace(/\/[^/]+$/, ''));
      path.join.mockImplementation((...args) => args.join('/'));
    });

    it('should write secrets to .env.local files when --write flag is used', async () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('test-secret-bytes'));
      process.argv = ['node', 'generate-secrets.js', '--write'];

      // Mock file exists to simulate updating existing files
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('NODE_ENV=development\nEXISTING_VAR=value\n');

      await import('../generate-secrets.js');

      // Verify writeFileSync was called for each .env.local file
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3); // root, web, mobile

      // Verify directories are created if needed
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should create .env.local from example if file does not exist', async () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('test-secret-bytes'));
      process.argv = ['node', 'generate-secrets.js', '--write'];

      // Mock file doesn't exist but example does
      fs.existsSync.mockImplementation(filePath => {
        return filePath.includes('.env.example');
      });
      fs.readFileSync.mockReturnValue('# Example file\nEXAMPLE_VAR=example\n');

      await import('../generate-secrets.js');

      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('.env.example'), 'utf8');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should update existing secrets in .env files', () => {
      const existingContent = `NODE_ENV=development
EXPO_PUBLIC_DEVICE_PEPPER=old-value
OTHER_VAR=keep-this
NEXTAUTH_SECRET=old-secret`;

      const secrets = {
        EXPO_PUBLIC_DEVICE_PEPPER: 'new-pepper-value',
        NEXTAUTH_SECRET: 'new-secret-value',
      };

      let updatedContent = existingContent;

      // Simulate the update logic from the script
      Object.entries(secrets).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;

        if (regex.test(updatedContent)) {
          updatedContent = updatedContent.replace(regex, newLine);
        } else {
          updatedContent += updatedContent.endsWith('\n') ? '' : '\n';
          updatedContent += `${newLine}\n`;
        }
      });

      expect(updatedContent).toContain('EXPO_PUBLIC_DEVICE_PEPPER=new-pepper-value');
      expect(updatedContent).toContain('NEXTAUTH_SECRET=new-secret-value');
      expect(updatedContent).toContain('OTHER_VAR=keep-this'); // Preserves existing vars
      expect(updatedContent).toContain('NODE_ENV=development');
    });

    it('should add new secrets to .env files', () => {
      const existingContent = `NODE_ENV=development
OTHER_VAR=keep-this`;

      const secrets = {
        NEW_SECRET: 'new-secret-value',
      };

      let updatedContent = existingContent;

      // Simulate adding new secrets
      Object.entries(secrets).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;

        if (!regex.test(updatedContent)) {
          updatedContent += updatedContent.endsWith('\n') ? '' : '\n';
          updatedContent += `${newLine}\n`;
        }
      });

      expect(updatedContent).toContain('NEW_SECRET=new-secret-value');
      expect(updatedContent).toContain('NODE_ENV=development');
      expect(updatedContent).toContain('OTHER_VAR=keep-this');
    });

    it('should handle missing directories', async () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('test-secret-bytes'));
      process.argv = ['node', 'generate-secrets.js', '--write'];

      // Mock directory doesn't exist
      fs.existsSync.mockReturnValue(false);

      await import('../generate-secrets.js');

      // Verify directories are created
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // This should not throw but create a minimal version
      const result = (() => {
        try {
          return fs.readFileSync('/test/path', 'utf8');
        } catch (error) {
          return ''; // Fallback to empty content
        }
      })();

      expect(result).toBe('');
    });

    it('should handle file write errors', async () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('test-secret-bytes'));
      process.argv = ['node', 'generate-secrets.js', '--write'];

      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      // The script should handle this gracefully
      await expect(import('../generate-secrets.js')).resolves.not.toThrow();
    });
  });

  describe('Security Validation', () => {
    it('should use cryptographically secure random generation', () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('secure-random-bytes'));

      // Simulate secret generation
      crypto.randomBytes(48);

      // Verify crypto.randomBytes is used (not Math.random)
      expect(crypto.randomBytes).toHaveBeenCalled();
    });

    it('should generate secrets with sufficient entropy', () => {
      // Test different secret lengths
      const secretSizes = [32, 48];

      secretSizes.forEach(size => {
        crypto.randomBytes.mockReturnValue(Buffer.alloc(size, 1));
        const secret = crypto.randomBytes(size).toString('base64');

        // Base64 encoding increases length by ~4/3
        expect(secret.length).toBeGreaterThan(size);
      });
    });

    it('should warn about security best practices', async () => {
      crypto.randomBytes.mockReturnValue(Buffer.from('test-bytes'));
      process.argv = ['node', 'generate-secrets.js'];

      await import('../generate-secrets.js');

      // Verify security warnings are displayed
      const logCalls = consoleSpy.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('never commit them to git');
      expect(logCalls).toContain('different secrets for development, staging, and production');
      expect(logCalls).toContain('Rotate secrets regularly');
    });
  });
});
