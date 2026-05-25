// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock environment variables for testing
// [已迁移至 Clerk] NEXTAUTH 变量已无运行时依赖，保留仅为测试兼容
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret-key-for-jest-testing";
