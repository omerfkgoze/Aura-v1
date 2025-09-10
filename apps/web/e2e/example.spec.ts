import { test, expect } from '@playwright/test';

test('basic test that passes without server', async () => {
  // Simple test that doesn't require a server
  expect(1 + 1).toBe(2);
});
