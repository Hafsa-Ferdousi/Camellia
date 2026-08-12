export default {
  testEnvironment: "jsdom",

  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  moduleFileExtensions: ["js", "jsx", "json"],

  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },

  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/main.jsx",
  ],
};