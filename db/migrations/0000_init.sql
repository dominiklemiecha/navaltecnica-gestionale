CREATE TYPE "public"."modalita_accettazione" AS ENUM('firma', 'PO');--> statement-breakpoint
CREATE TYPE "public"."ruolo_tecnico" AS ENUM('tecnico', 'responsabile_linea', 'officina', 'trasferta');--> statement-breakpoint
CREATE TYPE "public"."ruolo_utente" AS ENUM('admin', 'amministrazione', 'tecnico_ufficio', 'tecnico_campo', 'responsabile_linea', 'solo_lettura');--> statement-breakpoint
CREATE TYPE "public"."stato_assegnazione" AS ENUM('pianificato', 'confermato', 'in_corso', 'completato', 'annullato');--> statement-breakpoint
CREATE TYPE "public"."stato_fattura" AS ENUM('emessa', 'inviata', 'pagata_parziale', 'pagata', 'insoluta', 'annullata');--> statement-breakpoint
CREATE TYPE "public"."stato_pratica" AS ENUM('richiesta', 'offerta', 'in_attesa_accettazione', 'accettata', 'in_attesa_pagamento', 'materiale_in_arrivo', 'pianificata', 'in_esecuzione', 'chiusura_tecnica', 'da_fatturare', 'chiusa', 'annullata');--> statement-breakpoint
CREATE TYPE "public"."stato_report" AS ENUM('bozza', 'inviato', 'validato');--> statement-breakpoint
CREATE TYPE "public"."tipo_cliente" AS ENUM('cantiere', 'bordo', 'fornitore_misto');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('preventivo', 'preventivo_firmato', 'PO_cliente', 'ordine_fornitore', 'report_intervento', 'certificato', 'ddt', 'fattura', 'foto_intervento', 'listino', 'altro');--> statement-breakpoint
CREATE TYPE "public"."tipo_fattura" AS ENUM('proforma', 'SAL', 'finale', 'nota_credito');--> statement-breakpoint
CREATE TYPE "public"."tipo_impianto" AS ENUM('HAG_SEWAGE', 'DVZ_OWS', 'DVZ_STP', 'DVZ_GT', 'MATRIX', 'AP_MARINE', 'BIO_SEA', 'SKF', 'DAMEN', 'ALTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_lavoro" AS ENUM('TG_A', 'TG_A_1F', 'TG_A_2F', 'TG_B', 'TG_B_1F', 'TG_S', 'TG_AVV', 'TG_WARR', 'TG_ISP', 'TG_OFF', 'MAN_1Y', 'MAN_2Y', 'EXTRA', 'FORNITURA', 'TRAINING', 'ALTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimento_stock" AS ENUM('carico', 'scarico', 'rettifica', 'reso');--> statement-breakpoint
CREATE TYPE "public"."tipo_ordine" AS ENUM('cliente_in', 'fornitore_out');--> statement-breakpoint
CREATE TYPE "public"."tipo_preventivo_riga" AS ENUM('ricambio', 'manodopera', 'trasferta', 'officina', 'altro');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clienti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_cliente" NOT NULL,
	"ragione_sociale" varchar(255) NOT NULL,
	"nome_breve" varchar(100),
	"partita_iva" varchar(32),
	"codice_fiscale" varchar(32),
	"indirizzo" text,
	"citta" varchar(100),
	"cap" varchar(16),
	"paese" varchar(64) DEFAULT 'IT',
	"pec" varchar(255),
	"sdi_code" varchar(16),
	"termini_pagamento_giorni" integer,
	"note" text,
	"attivo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fornitori" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ragione_sociale" varchar(255) NOT NULL,
	"partita_iva" varchar(32),
	"email" varchar(255),
	"telefono" varchar(50),
	"paese" varchar(64) DEFAULT 'IT',
	"tempi_consegna_giorni_medi" integer,
	"note" text,
	"attivo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "imbarcazioni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255),
	"hull_number" varchar(100),
	"modello" varchar(100),
	"cantiere_costruttore_id" uuid,
	"proprietario_attuale_id" uuid,
	"armatore" varchar(255),
	"metri" numeric(6, 2),
	"anno_costruzione" integer,
	"bandiera" varchar(100),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "impianti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imbarcazione_id" uuid NOT NULL,
	"tipo" "tipo_impianto" NOT NULL,
	"modello" varchar(100),
	"tensione" varchar(32),
	"serial_number" varchar(64),
	"capacita" varchar(64),
	"data_installazione" date,
	"note" text,
	"attivo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referenti_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"ruolo" varchar(100),
	"email" varchar(255),
	"telefono" varchar(50),
	"principale" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sedi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"citta" varchar(100),
	"attiva" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sedi_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tecnici" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cognome" varchar(255),
	"ruolo" "ruolo_tecnico" DEFAULT 'tecnico' NOT NULL,
	"sede_id" uuid,
	"email" varchar(255),
	"telefono" varchar(50),
	"costo_orario" numeric(10, 2),
	"attivo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(64),
	"scope" text,
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tabella" varchar(100) NOT NULL,
	"record_id" varchar(64) NOT NULL,
	"azione" varchar(32) NOT NULL,
	"diff" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"nome" varchar(255),
	"ruolo" "ruolo_utente" DEFAULT 'solo_lettura' NOT NULL,
	"tecnico_id" uuid,
	"attivo" boolean DEFAULT true NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documenti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"pratica_id" uuid,
	"preventivo_id" uuid,
	"ordine_id" uuid,
	"report_id" uuid,
	"fattura_id" uuid,
	"descrizione" text,
	"file_path" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"sha256" varchar(64),
	"file_size" integer,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificati" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pratica_id" uuid NOT NULL,
	"numero" varchar(64),
	"tipo" varchar(64) NOT NULL,
	"data_emissione" date NOT NULL,
	"file_path" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fatture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pratica_id" uuid NOT NULL,
	"tipo" "tipo_fattura" NOT NULL,
	"numero" varchar(64) NOT NULL,
	"anno_fiscale" varchar(8) NOT NULL,
	"data_emissione" date NOT NULL,
	"importo_netto" numeric(12, 2) NOT NULL,
	"iva" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totale" numeric(12, 2) NOT NULL,
	"stato" "stato_fattura" DEFAULT 'emessa' NOT NULL,
	"riferimento_sdi" varchar(128),
	"file_path" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pagamenti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fattura_id" uuid NOT NULL,
	"data" date NOT NULL,
	"importo" numeric(12, 2) NOT NULL,
	"modalita" varchar(64),
	"riferimento" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"didascalia" text,
	"ordine" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_interventi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pratica_id" uuid NOT NULL,
	"tecnico_compilatore_id" uuid NOT NULL,
	"data_intervento" date NOT NULL,
	"orario_inizio" time,
	"orario_fine" time,
	"ore_lavorate" numeric(5, 2),
	"descrizione_attivita" text,
	"anomalie" text,
	"genera_extra" boolean DEFAULT false NOT NULL,
	"extra_pratica_id" uuid,
	"firma_cliente_path" text,
	"firma_tecnico_path" text,
	"nome_cliente_firma" text,
	"stato" "stato_report" DEFAULT 'bozza' NOT NULL,
	"inviato_at" timestamp with time zone,
	"validato_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_materiali" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"articolo_id" uuid,
	"descrizione" text NOT NULL,
	"quantita" numeric(12, 3) NOT NULL,
	"da_stock" boolean DEFAULT true NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listini_cantiere" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantiere_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"valido_da" date NOT NULL,
	"valido_a" date,
	"file_originale_path" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listini_righe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listino_id" uuid NOT NULL,
	"modello_scafo" varchar(64),
	"descrizione_articolo" text NOT NULL,
	"codice_articolo" varchar(64),
	"prezzo_acquisto" numeric(12, 2),
	"prezzo_vendita" numeric(12, 2),
	"sconto" numeric(6, 4),
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listini_scafo_personalizzati" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listino_id" uuid NOT NULL,
	"hull_number" varchar(64) NOT NULL,
	"modello_scafo" varchar(64),
	"tensione" varchar(32),
	"descrizione_articolo" text NOT NULL,
	"prezzo_vendita" numeric(12, 2),
	"prezzo_acquisto" numeric(12, 2),
	"data_ordine" date,
	"data_consegna" date,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "master_list_hamann" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stato" varchar(32) NOT NULL,
	"project_manager" varchar(100),
	"order_no" varchar(64),
	"serial_number" varchar(64),
	"yard" varchar(100),
	"hull" varchar(100),
	"type" varchar(64),
	"del_date_yard_req" date,
	"del_date_hamann_oc" date,
	"delay_on_yard_req" integer,
	"delay_on_hamann_oc" integer,
	"delivered_at" date,
	"note" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articoli" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codice" varchar(64) NOT NULL,
	"descrizione" text NOT NULL,
	"unita_misura" varchar(16) DEFAULT 'nr',
	"fornitore_default_id" uuid,
	"prezzo_acquisto_corrente" numeric(12, 2),
	"qta_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"qta_sotto_scorta" numeric(12, 3) DEFAULT '0',
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articoli_codice_unique" UNIQUE("codice")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ddt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" varchar(100) NOT NULL,
	"data_emissione" date NOT NULL,
	"pratica_id" uuid,
	"destinatario" text,
	"luogo_destinazione" text,
	"vettore" varchar(255),
	"causale_trasporto" varchar(100),
	"file_path" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ddt_righe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ddt_id" uuid NOT NULL,
	"articolo_id" uuid,
	"descrizione" text NOT NULL,
	"quantita" numeric(12, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordini" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_ordine" NOT NULL,
	"pratica_id" uuid,
	"numero" varchar(100) NOT NULL,
	"fornitore_id" uuid,
	"data_ordine" date,
	"data_consegna_prevista" date,
	"data_consegna_effettiva" date,
	"importo" numeric(12, 2),
	"valuta" varchar(8) DEFAULT 'EUR',
	"stato" varchar(32) DEFAULT 'aperto',
	"file_path" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordini_righe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ordine_id" uuid NOT NULL,
	"articolo_id" uuid,
	"descrizione" text NOT NULL,
	"quantita" numeric(12, 3) NOT NULL,
	"prezzo_unitario" numeric(12, 2),
	"importo" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movimenti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"articolo_id" uuid NOT NULL,
	"tipo" "tipo_movimento_stock" NOT NULL,
	"quantita" numeric(12, 3) NOT NULL,
	"pratica_id" uuid,
	"ordine_id" uuid,
	"ddt_id" uuid,
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assegnazioni_intervento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pratica_id" uuid NOT NULL,
	"tecnico_id" uuid NOT NULL,
	"sede_id" uuid,
	"data" date NOT NULL,
	"orario_da" time,
	"orario_a" time,
	"stato" "stato_assegnazione" DEFAULT 'pianificato' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pratiche" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codice" varchar(32) NOT NULL,
	"anno_riferimento" integer NOT NULL,
	"cliente_id" uuid NOT NULL,
	"imbarcazione_id" uuid,
	"sede_intervento_id" uuid,
	"stato" "stato_pratica" DEFAULT 'richiesta' NOT NULL,
	"tipo_lavoro" "tipo_lavoro",
	"descrizione_problema" text,
	"tempistiche_richieste" text,
	"pratica_padre_id" uuid,
	"data_apertura" timestamp with time zone DEFAULT now() NOT NULL,
	"data_chiusura" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pratiche_impianti" (
	"pratica_id" uuid NOT NULL,
	"impianto_id" uuid NOT NULL,
	CONSTRAINT "pratiche_impianti_pratica_id_impianto_id_pk" PRIMARY KEY("pratica_id","impianto_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pratiche_tecnici" (
	"pratica_id" uuid NOT NULL,
	"tecnico_id" uuid NOT NULL,
	"ruolo_nella_pratica" varchar(100),
	CONSTRAINT "pratiche_tecnici_pratica_id_tecnico_id_pk" PRIMARY KEY("pratica_id","tecnico_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transizioni_pratica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pratica_id" uuid NOT NULL,
	"stato_da" "stato_pratica",
	"stato_a" "stato_pratica" NOT NULL,
	"evento" varchar(64) NOT NULL,
	"payload" text,
	"utente_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preventivi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pratica_id" uuid NOT NULL,
	"codice_offerta" varchar(64) NOT NULL,
	"versione" integer DEFAULT 1 NOT NULL,
	"totale_netto" numeric(12, 2),
	"sconto" numeric(6, 2),
	"iva" numeric(6, 2) DEFAULT '22',
	"totale_lordo" numeric(12, 2),
	"validita_giorni" integer DEFAULT 30,
	"file_generato_path" text,
	"file_firmato_path" text,
	"data_invio" timestamp with time zone,
	"data_accettazione" timestamp with time zone,
	"modalita_accettazione" "modalita_accettazione",
	"riferimento_po" varchar(100),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preventivi_righe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preventivo_id" uuid NOT NULL,
	"tipo" "tipo_preventivo_riga" NOT NULL,
	"descrizione" text NOT NULL,
	"codice_articolo" varchar(64),
	"impianto_id" uuid,
	"quantita" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unita_misura" varchar(16) DEFAULT 'nr',
	"prezzo_unitario" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sconto" numeric(6, 2) DEFAULT '0',
	"importo" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ordine" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "imbarcazioni" ADD CONSTRAINT "imbarcazioni_cantiere_costruttore_id_clienti_id_fk" FOREIGN KEY ("cantiere_costruttore_id") REFERENCES "public"."clienti"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "imbarcazioni" ADD CONSTRAINT "imbarcazioni_proprietario_attuale_id_clienti_id_fk" FOREIGN KEY ("proprietario_attuale_id") REFERENCES "public"."clienti"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "impianti" ADD CONSTRAINT "impianti_imbarcazione_id_imbarcazioni_id_fk" FOREIGN KEY ("imbarcazione_id") REFERENCES "public"."imbarcazioni"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referenti_cliente" ADD CONSTRAINT "referenti_cliente_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clienti"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tecnici" ADD CONSTRAINT "tecnici_sede_id_sedi_id_fk" FOREIGN KEY ("sede_id") REFERENCES "public"."sedi"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tecnico_id_tecnici_id_fk" FOREIGN KEY ("tecnico_id") REFERENCES "public"."tecnici"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificati" ADD CONSTRAINT "certificati_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fatture" ADD CONSTRAINT "fatture_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pagamenti" ADD CONSTRAINT "pagamenti_fattura_id_fatture_id_fk" FOREIGN KEY ("fattura_id") REFERENCES "public"."fatture"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_foto" ADD CONSTRAINT "report_foto_report_id_report_interventi_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report_interventi"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_interventi" ADD CONSTRAINT "report_interventi_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_interventi" ADD CONSTRAINT "report_interventi_tecnico_compilatore_id_tecnici_id_fk" FOREIGN KEY ("tecnico_compilatore_id") REFERENCES "public"."tecnici"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_materiali" ADD CONSTRAINT "report_materiali_report_id_report_interventi_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report_interventi"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_materiali" ADD CONSTRAINT "report_materiali_articolo_id_articoli_id_fk" FOREIGN KEY ("articolo_id") REFERENCES "public"."articoli"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listini_cantiere" ADD CONSTRAINT "listini_cantiere_cantiere_id_clienti_id_fk" FOREIGN KEY ("cantiere_id") REFERENCES "public"."clienti"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listini_righe" ADD CONSTRAINT "listini_righe_listino_id_listini_cantiere_id_fk" FOREIGN KEY ("listino_id") REFERENCES "public"."listini_cantiere"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listini_scafo_personalizzati" ADD CONSTRAINT "listini_scafo_personalizzati_listino_id_listini_cantiere_id_fk" FOREIGN KEY ("listino_id") REFERENCES "public"."listini_cantiere"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articoli" ADD CONSTRAINT "articoli_fornitore_default_id_fornitori_id_fk" FOREIGN KEY ("fornitore_default_id") REFERENCES "public"."fornitori"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ddt" ADD CONSTRAINT "ddt_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ddt_righe" ADD CONSTRAINT "ddt_righe_ddt_id_ddt_id_fk" FOREIGN KEY ("ddt_id") REFERENCES "public"."ddt"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ddt_righe" ADD CONSTRAINT "ddt_righe_articolo_id_articoli_id_fk" FOREIGN KEY ("articolo_id") REFERENCES "public"."articoli"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordini" ADD CONSTRAINT "ordini_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordini" ADD CONSTRAINT "ordini_fornitore_id_fornitori_id_fk" FOREIGN KEY ("fornitore_id") REFERENCES "public"."fornitori"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordini_righe" ADD CONSTRAINT "ordini_righe_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "public"."ordini"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordini_righe" ADD CONSTRAINT "ordini_righe_articolo_id_articoli_id_fk" FOREIGN KEY ("articolo_id") REFERENCES "public"."articoli"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movimenti" ADD CONSTRAINT "stock_movimenti_articolo_id_articoli_id_fk" FOREIGN KEY ("articolo_id") REFERENCES "public"."articoli"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movimenti" ADD CONSTRAINT "stock_movimenti_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movimenti" ADD CONSTRAINT "stock_movimenti_ordine_id_ordini_id_fk" FOREIGN KEY ("ordine_id") REFERENCES "public"."ordini"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movimenti" ADD CONSTRAINT "stock_movimenti_ddt_id_ddt_id_fk" FOREIGN KEY ("ddt_id") REFERENCES "public"."ddt"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assegnazioni_intervento" ADD CONSTRAINT "assegnazioni_intervento_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assegnazioni_intervento" ADD CONSTRAINT "assegnazioni_intervento_tecnico_id_tecnici_id_fk" FOREIGN KEY ("tecnico_id") REFERENCES "public"."tecnici"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assegnazioni_intervento" ADD CONSTRAINT "assegnazioni_intervento_sede_id_sedi_id_fk" FOREIGN KEY ("sede_id") REFERENCES "public"."sedi"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pratiche" ADD CONSTRAINT "pratiche_cliente_id_clienti_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clienti"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pratiche" ADD CONSTRAINT "pratiche_imbarcazione_id_imbarcazioni_id_fk" FOREIGN KEY ("imbarcazione_id") REFERENCES "public"."imbarcazioni"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pratiche" ADD CONSTRAINT "pratiche_sede_intervento_id_sedi_id_fk" FOREIGN KEY ("sede_intervento_id") REFERENCES "public"."sedi"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pratiche_impianti" ADD CONSTRAINT "pratiche_impianti_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pratiche_tecnici" ADD CONSTRAINT "pratiche_tecnici_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pratiche_tecnici" ADD CONSTRAINT "pratiche_tecnici_tecnico_id_tecnici_id_fk" FOREIGN KEY ("tecnico_id") REFERENCES "public"."tecnici"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transizioni_pratica" ADD CONSTRAINT "transizioni_pratica_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_pratica_id_pratiche_id_fk" FOREIGN KEY ("pratica_id") REFERENCES "public"."pratiche"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventivi_righe" ADD CONSTRAINT "preventivi_righe_preventivo_id_preventivi_id_fk" FOREIGN KEY ("preventivo_id") REFERENCES "public"."preventivi"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "preventivi_righe" ADD CONSTRAINT "preventivi_righe_impianto_id_impianti_id_fk" FOREIGN KEY ("impianto_id") REFERENCES "public"."impianti"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clienti_nome_breve_idx" ON "clienti" USING btree ("nome_breve");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clienti_rag_soc_idx" ON "clienti" USING btree ("ragione_sociale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clienti_tipo_idx" ON "clienti" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imbarcazioni_nome_idx" ON "imbarcazioni" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imbarcazioni_hull_idx" ON "imbarcazioni" USING btree ("hull_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imbarcazioni_cantiere_idx" ON "imbarcazioni" USING btree ("cantiere_costruttore_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "imbarcazioni_cantiere_hull_uq" ON "imbarcazioni" USING btree ("cantiere_costruttore_id","hull_number") WHERE "imbarcazioni"."hull_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "impianti_imbarcazione_idx" ON "impianti" USING btree ("imbarcazione_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "impianti_sn_idx" ON "impianti" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "impianti_tipo_idx" ON "impianti" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documenti_tipo_idx" ON "documenti" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documenti_pratica_idx" ON "documenti" USING btree ("pratica_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fatture_pratica_idx" ON "fatture" USING btree ("pratica_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fatture_stato_idx" ON "fatture" USING btree ("stato");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_pratica_idx" ON "report_interventi" USING btree ("pratica_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listini_cantiere_idx" ON "listini_cantiere" USING btree ("cantiere_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listini_righe_listino_idx" ON "listini_righe" USING btree ("listino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listini_righe_modello_idx" ON "listini_righe" USING btree ("modello_scafo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listini_scafo_hull_idx" ON "listini_scafo_personalizzati" USING btree ("hull_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listini_scafo_listino_idx" ON "listini_scafo_personalizzati" USING btree ("listino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ml_sn_idx" ON "master_list_hamann" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ml_yard_hull_idx" ON "master_list_hamann" USING btree ("yard","hull");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articoli_desc_idx" ON "articoli" USING btree ("descrizione");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordini_pratica_idx" ON "ordini" USING btree ("pratica_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ordini_tipo_idx" ON "ordini" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assegnazioni_data_idx" ON "assegnazioni_intervento" USING btree ("data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assegnazioni_tecnico_data_idx" ON "assegnazioni_intervento" USING btree ("tecnico_id","data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assegnazioni_pratica_idx" ON "assegnazioni_intervento" USING btree ("pratica_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pratiche_codice_anno_uq" ON "pratiche" USING btree ("codice","anno_riferimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pratiche_stato_idx" ON "pratiche" USING btree ("stato");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pratiche_cliente_idx" ON "pratiche" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pratiche_imbarcazione_idx" ON "pratiche" USING btree ("imbarcazione_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "preventivi_pratica_idx" ON "preventivi" USING btree ("pratica_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "preventivi_righe_prev_idx" ON "preventivi_righe" USING btree ("preventivo_id");