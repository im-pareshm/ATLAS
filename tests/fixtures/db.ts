import { test as base } from '@playwright/test';
import { execSync } from 'child_process';
import { TEST_USER } from '../helpers/test-data';

/**
 * Database fixtures for test isolation
 */
interface DbWorkerFixtures {
  // Fixture to reset database before test suite
  resetDatabase: void;
  // Fixture to seed test data
  seedTestData: void;
}

export const test = base.extend<Record<string, never>, DbWorkerFixtures>({
  // Reset database - runs once per worker
  resetDatabase: [async ({}, use, testInfo) => {
    if (testInfo.workerIndex === 0) {
      try {
        execSync('npm run db:reset -- --force', {
          cwd: process.cwd(),
          stdio: 'inherit',
          timeout: 60000,
        });
      } catch (error) {
        console.warn('Database reset failed, continuing...', error);
      }
    }
    await use();
  }, { scope: 'worker' }],

  // Seed test data - runs once per worker
  seedTestData: [async ({}, use, testInfo) => {
    if (testInfo.workerIndex === 0) {
      try {
        execSync('npm run db:seed', {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: {
            ...process.env,
            ADMIN_EMAIL: TEST_USER.email,
            ADMIN_PASSWORD: TEST_USER.password,
          },
          timeout: 60000,
        });
      } catch (error) {
        console.warn('Database seed failed, continuing...', error);
      }
    }
    await use();
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';
