import { test, expect } from "@playwright/test";
import path from "node:path";
import { loadFixtures } from "../fixtures";

const fx = loadFixtures();
const PDF = path.join(__dirname, "..", "files", "sample.pdf");
const TXT = path.join(__dirname, "..", "files", "sample.txt");

/**
 * Scenario "operatore Bordo" (cliente privato), step 5→6 del PDF:
 * accettata → proforma → incasso anticipato → ricambi.
 * Verifica anche il gate ordini ricambi prima/dopo l'incasso.
 */
test("Iter Bordo: proforma, gate ordini, incassi e auto-avanzamento", async ({ page }) => {
  const prat = `/pratiche/${fx.praticaBordoId}`;

  // 1. La pratica Bordo accettata mostra la sezione iter amministrativo
  await page.goto(prat);
  await expect(page.getByRole("heading", { name: "Iter amministrativo Bordo" })).toBeVisible();
  await expect(page.getByText("Flusso Bordo (cliente privato)")).toBeVisible();

  // 2. Genera proforma → pratica avanza a "in attesa pagamento"
  await page.getByRole("button", { name: /Genera proforma/ }).click();
  await expect(page).toHaveURL(/ok=/);
  await expect(page.getByText("Att. pagamento").first()).toBeVisible();

  // 3. GATE: ordine a fornitore bloccato finché la proforma non è incassata
  await page.goto("/ordini/new");
  await page.locator('input[name="numero"]').fill(`E2E-ORD-${Date.now()}`);
  await page.locator('select[name="praticaId"]').selectOption(fx.praticaBordoId);
  await page.getByRole("button", { name: "Crea ordine" }).click();
  await expect(page).toHaveURL(/ordini\/new\?err=/);
  await expect(page.getByText(/Cliente Bordo/)).toBeVisible();

  // 4. Incasso PARZIALE → resta in attesa pagamento
  await page.goto(prat);
  await page.locator('input[name="importo"]').fill("1000");
  await page.locator('input[name="modalita"]').fill("bonifico");
  await page.getByRole("button", { name: "Registra incasso" }).click();
  await expect(page).toHaveURL(/ok=/);
  await expect(page.getByText("Att. pagamento").first()).toBeVisible();
  await expect(page.getByText(/Residuo/)).toBeVisible();

  // 5. Incasso a SALDO → auto-avanzamento a "materiale in arrivo"
  await page.goto(prat);
  await page.locator('input[name="importo"]').fill("1440");
  await page.getByRole("button", { name: "Registra incasso" }).click();
  await expect(page).toHaveURL(/ok=/);
  await expect(page.getByText("Materiale in arrivo").first()).toBeVisible();

  // 6. GATE sbloccato: ora l'ordine a fornitore è consentito
  await page.goto("/ordini/new");
  await page.locator('input[name="numero"]').fill(`E2E-ORD-OK-${Date.now()}`);
  await page.locator('select[name="praticaId"]').selectOption(fx.praticaBordoId);
  await page.getByRole("button", { name: "Crea ordine" }).click();
  await expect(page).toHaveURL(/\/ordini$/);

  // 7. Storico: cronologia completa con proforma e incassi
  await page.goto(`${prat}/storico`);
  await expect(page.getByRole("heading", { name: "Storico interventi" })).toBeVisible();
  await expect(page.getByText(/proforma/).first()).toBeVisible();
  // NB: nel runtime del container formatEur rende "1000,00 €" (ICU senza separatore
  // migliaia) e usa lo spazio insecabile prima di € → matcho solo cifre+decimali.
  await expect(page.getByText(/Incasso 1\.?000,00/)).toBeVisible();
  await expect(page.getByText(/Incasso 1\.?440,00/)).toBeVisible();
});

/**
 * Scenario "operatore Cantiere": iter senza incasso anticipato (vale il PO),
 * dall'accettazione si passa direttamente al materiale.
 */
test("Iter Cantiere: nessuna proforma, transizione diretta al materiale", async ({ page }) => {
  const prat = `/pratiche/${fx.praticaCantiereId}`;
  await page.goto(prat);

  // Flusso cantiere e NESSUNA sezione iter amministrativo Bordo
  await expect(page.getByText("Flusso Cantiere")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Iter amministrativo Bordo" })).toHaveCount(0);

  // Da "accettata" l'unica transizione operativa è "Materiale in arrivo"
  await expect(page.getByRole("button", { name: /Materiale in arrivo/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Att\. pagamento/ })).toHaveCount(0);

  // Click → avanza senza gate pagamento
  await page.getByRole("button", { name: /Materiale in arrivo/ }).click();
  await expect(page.getByText("Materiale in arrivo").first()).toBeVisible();
});

/**
 * Scenario upload preventivo firmato (step 3): validazione tipo file e accettazione.
 */
test("Upload preventivo firmato: rifiuta tipo errato e accetta il PDF", async ({ page }) => {
  const url = `/preventivi/${fx.preventivoUploadId}`;

  // 1. File di tipo non ammesso → errore, preventivo NON accettato
  await page.goto(url);
  await page.locator('input[name="fileFirmato"]').setInputFiles(TXT);
  await page.getByRole("button", { name: "Segna accettato" }).click();
  await expect(page).toHaveURL(/err=/);
  await expect(page.getByText(/Tipo file non ammesso/)).toBeVisible();

  // 2. PDF valido → preventivo accettato + link al documento
  await page.goto(url);
  await page.locator('select[name="modalita"]').selectOption("firma");
  await page.locator('input[name="fileFirmato"]').setInputFiles(PDF);
  await page.getByRole("button", { name: "Segna accettato" }).click();
  await expect(page.getByText(/Accettato il/)).toBeVisible();
  const link = page.getByRole("link", { name: /Scarica documento firmato/ });
  await expect(link).toBeVisible();

  // 3. Il file è scaricabile (200) tramite la route autenticata
  const href = await link.getAttribute("href");
  const resp = await page.request.get(href!);
  expect(resp.status()).toBe(200);
  expect(resp.headers()["content-type"]).toContain("application/pdf");
});
