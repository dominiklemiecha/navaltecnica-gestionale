import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { BASE_URL, STORAGE_STATE } from "./playwright.config";
import { seedFixtures, FIXTURES_PATH } from "./fixtures";

const ADMIN_EMAIL = process.env.E2E_EMAIL ?? "admin@navaltecnica.it";
const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? "admin";

export default async function globalSetup() {
  // 1. Seed dati di test deterministici
  const ids = seedFixtures();
  writeFileSync(FIXTURES_PATH, JSON.stringify(ids, null, 2));

  // 2. Login e salvataggio sessione autenticata
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("textbox", { name: "Email" }).fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}
