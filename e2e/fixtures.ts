import { readFileSync } from "node:fs";
import path from "node:path";
import { sql, sqlScalar } from "./db";

export const FIXTURES_PATH = path.join(__dirname, "fixtures.json");

// Marker per identificare e ripulire i dati di test.
export const E2E_MARKER = "E2E";
const ANNO = 2099;

export type FixtureIds = {
  praticaBordoId: string;
  praticaCantiereId: string;
  praticaUploadId: string;
  preventivoUploadId: string;
};

/** Rimuove tutti i dati creati dall'harness (idempotente). */
export function teardownFixtures(): void {
  const praticheDiTest = `SELECT p.id FROM pratiche p JOIN clienti c ON c.id=p.cliente_id WHERE c.ragione_sociale LIKE '${E2E_MARKER}%'`;
  sql(
    `DELETE FROM pagamenti WHERE fattura_id IN (SELECT id FROM fatture WHERE pratica_id IN (${praticheDiTest}))`
  );
  sql(`DELETE FROM fatture WHERE pratica_id IN (${praticheDiTest})`);
  sql(`DELETE FROM documenti WHERE pratica_id IN (${praticheDiTest})`);
  sql(`DELETE FROM ordini WHERE pratica_id IN (${praticheDiTest})`);
  sql(`DELETE FROM preventivi WHERE pratica_id IN (${praticheDiTest})`);
  sql(`DELETE FROM transizioni_pratica WHERE pratica_id IN (${praticheDiTest})`);
  sql(
    `DELETE FROM pratiche WHERE cliente_id IN (SELECT id FROM clienti WHERE ragione_sociale LIKE '${E2E_MARKER}%')`
  );
  sql(`DELETE FROM imbarcazioni WHERE nome LIKE '${E2E_MARKER}%'`);
  sql(`DELETE FROM clienti WHERE ragione_sociale LIKE '${E2E_MARKER}%'`);
}

/** Crea da zero i dati di test e ritorna gli id necessari agli scenari. */
export function seedFixtures(): FixtureIds {
  teardownFixtures();

  const cliBordo = sqlScalar(
    `INSERT INTO clienti (tipo, ragione_sociale) VALUES ('bordo','${E2E_MARKER} BORDO') RETURNING id`
  );
  const cliCantiere = sqlScalar(
    `INSERT INTO clienti (tipo, ragione_sociale) VALUES ('cantiere','${E2E_MARKER} CANTIERE') RETURNING id`
  );

  const imbBordo = sqlScalar(
    `INSERT INTO imbarcazioni (nome, hull_number) VALUES ('${E2E_MARKER} BARCA BORDO','${E2E_MARKER}-HULL-B') RETURNING id`
  );
  const imbCantiere = sqlScalar(
    `INSERT INTO imbarcazioni (nome, hull_number) VALUES ('${E2E_MARKER} BARCA CANTIERE','${E2E_MARKER}-HULL-C') RETURNING id`
  );

  const praticaBordoId = sqlScalar(
    `INSERT INTO pratiche (codice, anno_riferimento, cliente_id, imbarcazione_id, stato, tipo_lavoro) VALUES ('901',${ANNO},'${cliBordo}','${imbBordo}','accettata','TG_A') RETURNING id`
  );
  const praticaCantiereId = sqlScalar(
    `INSERT INTO pratiche (codice, anno_riferimento, cliente_id, imbarcazione_id, stato, tipo_lavoro) VALUES ('902',${ANNO},'${cliCantiere}','${imbCantiere}','accettata','TG_A') RETURNING id`
  );
  const praticaUploadId = sqlScalar(
    `INSERT INTO pratiche (codice, anno_riferimento, cliente_id, imbarcazione_id, stato, tipo_lavoro) VALUES ('903',${ANNO},'${cliCantiere}','${imbCantiere}','offerta','TG_A') RETURNING id`
  );

  // Preventivo accettato sulla pratica Bordo (per generare la proforma)
  sql(
    `INSERT INTO preventivi (pratica_id, codice_offerta, versione, totale_netto, iva, totale_lordo, data_invio, data_accettazione, modalita_accettazione) VALUES ('${praticaBordoId}','${E2E_MARKER}-BORDO',1,2000,22,2440,NOW(),NOW(),'firma')`
  );

  // Preventivo solo "inviato" sulla pratica upload (per il test di upload firmato)
  const preventivoUploadId = sqlScalar(
    `INSERT INTO preventivi (pratica_id, codice_offerta, versione, totale_netto, iva, totale_lordo, data_invio) VALUES ('${praticaUploadId}','${E2E_MARKER}-UP',1,500,22,610,NOW()) RETURNING id`
  );

  return { praticaBordoId, praticaCantiereId, praticaUploadId, preventivoUploadId };
}

export function loadFixtures(): FixtureIds {
  return JSON.parse(readFileSync(FIXTURES_PATH, "utf8"));
}
