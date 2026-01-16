import { PrismaClient } from '@prisma/client';

// Mock Prisma Client for testing
jest.mock('../src/models', () => ({
  prisma: new PrismaClient(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/peoplebooster_test';

// Global test setup
beforeAll(async () => {
  // Setup code before all tests
});

// Global test teardown
afterAll(async () => {
  // Cleanup code after all tests
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
