import { pgEnum } from "drizzle-orm/pg-core";

export const tipoClienteEnum = pgEnum("tipo_cliente", ["cantiere", "bordo", "fornitore_misto"]);

export const tipoImpiantoEnum = pgEnum("tipo_impianto", [
  "HAG_SEWAGE",
  "DVZ_OWS",
  "DVZ_STP",
  "DVZ_GT",
  "MATRIX",
  "AP_MARINE",
  "BIO_SEA",
  "SKF",
  "DAMEN",
  "ALTRO",
]);

export const ruoloTecnicoEnum = pgEnum("ruolo_tecnico", [
  "tecnico",
  "responsabile_linea",
  "officina",
  "trasferta",
]);

export const ruoloUtenteEnum = pgEnum("ruolo_utente", [
  "admin",
  "amministrazione",
  "tecnico_ufficio",
  "tecnico_campo",
  "responsabile_linea",
  "solo_lettura",
]);

export const statoPraticaEnum = pgEnum("stato_pratica", [
  "richiesta",
  "offerta",
  "in_attesa_accettazione",
  "accettata",
  "in_attesa_pagamento",
  "materiale_in_arrivo",
  "pianificata",
  "in_esecuzione",
  "chiusura_tecnica",
  "da_fatturare",
  "chiusa",
  "annullata",
]);

export const tipoLavoroEnum = pgEnum("tipo_lavoro", [
  "TG_A",
  "TG_A_1F",
  "TG_A_2F",
  "TG_B",
  "TG_B_1F",
  "TG_S",
  "TG_AVV",
  "TG_WARR",
  "TG_ISP",
  "TG_OFF",
  "MAN_1Y",
  "MAN_2Y",
  "EXTRA",
  "FORNITURA",
  "TRAINING",
  "ALTRO",
]);

export const tipoPreventivoRigaEnum = pgEnum("tipo_preventivo_riga", [
  "ricambio",
  "manodopera",
  "trasferta",
  "officina",
  "altro",
]);

export const modalitaAccettazioneEnum = pgEnum("modalita_accettazione", ["firma", "PO"]);

export const tipoOrdineEnum = pgEnum("tipo_ordine", ["cliente_in", "fornitore_out"]);

export const tipoMovimentoStockEnum = pgEnum("tipo_movimento_stock", [
  "carico",
  "scarico",
  "rettifica",
  "reso",
]);

export const statoAssegnazioneEnum = pgEnum("stato_assegnazione", [
  "pianificato",
  "confermato",
  "in_corso",
  "completato",
  "annullato",
]);

export const statoReportEnum = pgEnum("stato_report", ["bozza", "inviato", "validato"]);

export const tipoFatturaEnum = pgEnum("tipo_fattura", ["proforma", "SAL", "finale", "nota_credito"]);

export const statoFatturaEnum = pgEnum("stato_fattura", [
  "emessa",
  "inviata",
  "pagata_parziale",
  "pagata",
  "insoluta",
  "annullata",
]);

export const tipoDocumentoEnum = pgEnum("tipo_documento", [
  "preventivo",
  "preventivo_firmato",
  "PO_cliente",
  "ordine_fornitore",
  "report_intervento",
  "certificato",
  "ddt",
  "fattura",
  "foto_intervento",
  "listino",
  "altro",
]);
