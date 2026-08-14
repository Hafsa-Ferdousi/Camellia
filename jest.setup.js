require('dotenv').config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.MONGODB_URI = 'mongodb://localhost:27017/camellia_test';

// Suppress console logs in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});