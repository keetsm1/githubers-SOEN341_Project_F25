module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',

    roots: ['<rootDir>/src'],

    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },

    setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupTests.ts'],

    globals: {
        'ts-jest': {
            tsconfig: '<rootDir>/tsconfig.json'
        }
    },

    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/main.tsx',
        '!src/vite-env.d.ts'
    ],

    coverageDirectory: '<rootDir>/reports/testing',
    coverageReporters: ['text', 'text-summary', 'lcov', 'json']
};
