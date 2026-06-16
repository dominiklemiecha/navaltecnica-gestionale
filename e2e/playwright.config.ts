import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3001";
export const STORAGE_STATE = path.join(__dirname, ".auth", "state.json");

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Stato DB condiviso tra gli scenari → esecuzione seriale, niente parallelismo.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
