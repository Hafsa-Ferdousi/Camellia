module.exports = {
  testEnvironment: "node",

  setupFiles: [
    "<rootDir>/jest.setup.cjs",
  ],

  testMatch: [
    "**/tests/**/*.test.js",
  ],

  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
  ],

  coverageDirectory: "coverage",

  coverageReporters: [
    "text",
    "text-summary",
    "html",
    "lcov",
  ],
};