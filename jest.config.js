export default {
  transform: {},                      // disable transforms (no Babel)
  extensionsToTreatAsEsm: ['.js'],  // treat .js files as ES Modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',    // fix import paths
  },
  testEnvironment: 'node',
};