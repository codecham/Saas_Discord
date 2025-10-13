module.exports = {
  displayName: 'bot',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      // Ignorer les erreurs de déclarations non utilisées
      diagnostics: {
        ignoreCodes: [6133]
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/bot',
  
  // Chemins des tests
  testMatch: [
    '<rootDir>/tests/**/*.spec.ts'
  ],
  
  // Fichiers de setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  
  // Coverage
  collectCoverageFrom: [
    'src/listeners/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  
  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Timeouts
  testTimeout: 10000,
  
  // Module paths
  moduleNameMapper: {
    '^@my-project/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
  },
  
  // Ignorer les fichiers de build
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};