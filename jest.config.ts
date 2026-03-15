import type { Config } from "jest"

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/services/**/*.ts",
    "!src/**/*.d.ts",
    "!src/generated/**",
  ],
}

export default config
