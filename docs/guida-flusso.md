# Guida operativa — Flusso Service nel gestionale

Questa guida segue **punto per punto** lo schema del PDF "Flusso di lavoro Service" e spiega, per ogni passo, cosa fare nel gestionale.

> Promemoria veloce: il menu a sinistra ha tutte le sezioni (Pratiche, Preventivi, Clienti, Imbarcazioni, Ordini, Fatture, Calendario...). Ogni pratica ha in alto i pulsanti di stato che la fanno avanzare lungo il flusso.

---

## 1. Ricezione richiesta Service

Arriva la richiesta dal **Bordo** (cliente privato) o dal **Cantiere**.

Nel gestionale:
1. Vai su **Pratiche → Nuova pratica**.
2. Seleziona il **cliente** (se nuovo, crealo prima in **Clienti**: scegli tipo *Bordo* o *Cantiere*).
3. Seleziona l'**imbarcazione** (o creala in **Imbarcazioni**) e gli **impianti** coinvolti.
4. Compila: **problema segnalato**, **luogo intervento** (sede), **tempistiche richieste**, tipo di lavoro.

La pratica nasce in stato **Richiesta**.

---

## 2. Verifica archivio e preparazione offerta

Si controlla lo storico e si prepara l'offerta con ricambi, manodopera, trasferte, officina.

Nel gestionale:
1. Apri la pratica → pulsante **🕓 Storico completo** per vedere interventi e documenti precedenti dell'imbarcazione.
2. Nella pratica, sezione Preventivi → **+ Nuovo preventivo**.
3. Aggiungi le righe: per ogni voce scegli il **tipo** (*ricambio / manodopera / trasferta / officina*), descrizione, quantità, prezzo.
   - Sulla descrizione compaiono i **suggerimenti dal listino** del cantiere costruttore.
4. Quando è pronto, usa **🖨 Stampa / Esporta PDF** per inviarlo al cliente.
5. Premi **Segna come inviato**: la pratica passa a **Offerta**.

---

## 3. Ricezione accettazione preventivo

Il cliente accetta: **firma** (Bordo) oppure **ordine di acquisto / PO** (Cantiere).
Senza copia firmata non si procede.

Nel gestionale (dentro il preventivo inviato):
1. Scegli la **modalità**: *Firma* oppure *PO*.
2. (PO) inserisci il **riferimento PO**.
3. **Carica il documento firmato** (PDF o foto) nel campo *Documento firmato*.
4. Premi **Segna accettato**.

Il documento resta archiviato e scaricabile; la pratica passa a **Accettata**.
> Se hai accettato senza allegato, puoi caricarlo dopo con il pulsante **Carica firmato**.

---

## 4. Apertura pratica sul gestionale

Tutti i dati confluiscono nella pratica.

Nel gestionale, sulla pratica trovi già: dati cliente, imbarcazione, offerta accettata (con copia firmata archiviata), tipo lavoro/impianti, e puoi assegnare i **tecnici** nella sezione *Pianificazione interventi*.

---

## 5. Gestione amministrativa iniziale / condizioni di pagamento

Qui i due percorsi si separano. Il gestionale lo fa **in automatico** in base al tipo cliente.

**Cliente Bordo (privato):** serve l'anticipo totale.
1. Sulla pratica accettata compare la sezione **Iter amministrativo Bordo**.
2. Premi **Genera proforma da preventivo accettato**: crea la proforma e porta la pratica in **Attesa pagamento**.
3. Invia la proforma al cliente (la trovi tra le Fatture).

**Cliente Cantiere:** vale il PO, fatturazione a fine lavoro.
- Dalla pratica accettata premi direttamente **→ Materiale in arrivo**: non serve incasso anticipato.

> Nota: sui clienti Bordo i pulsanti mostrano solo il percorso corretto (prima il pagamento), sui Cantieri si salta direttamente al materiale.

---

## 6. Ricezione pagamento e ordine ricambi

**Cliente Bordo:** registra l'incasso.
1. Nella sezione *Iter amministrativo Bordo* → **Registra incasso** (importo, modalità, riferimento).
2. Quando l'incasso copre il totale, la pratica avanza **da sola** a **Materiale in arrivo**.

Ordine ricambi (entrambi):
- Vai su **Ordini & Magazzino → Nuovo ordine**, collega la pratica e il fornitore.
- ⛔ Per i clienti **Bordo** l'ordine al fornitore è **bloccato** finché la proforma non è incassata (te lo segnala con un avviso). Per i Cantieri è sempre consentito.
- Se i ricambi sono già a magazzino, prepara il **DDT** per il trasporto.

---

## 7. Pianificazione intervento

Si programma l'intervento in base a ricambi/tecnici/disponibilità.

Nel gestionale:
1. Sulla pratica, sezione **Pianificazione interventi**: scegli **tecnico**, **sede**, **data** e orari → **+ Assegna**.
2. Puoi vedere il quadro generale in **Calendario**.
3. Alla prima assegnazione la pratica passa a **Pianificata**.

---

## 8. Esecuzione intervento

Intervento a bordo o in officina, con report delle attività.

Nel gestionale:
1. Sulla pratica → **📋 Report interventi**.
2. Compila: attività svolte, ore, **materiali utilizzati**, eventuali **anomalie**, foto.
3. Se emerge una **lavorazione EXTRA**, segnala l'anomalia: genera un nuovo preventivo che riparte dal punto 2.

Porta la pratica a **In esecuzione** e poi a **Chiusura tecnica** con i pulsanti di stato.

---

## 9. Chiusura tecnica

Si inviano al cliente report e certificati di fine lavoro.

Nel gestionale:
1. Verifica che il report sia completo e marcalo come **inviato/validato**.
2. Allega/registra i **certificati** di fine lavoro sulla pratica.
3. (Per ora l'invio al cliente si fa manualmente — email automatica non ancora attiva.)

---

## 10. Fatturazione finale e chiusura pratica

**Cantieri:** SAL ed emissione fattura finale.
**Bordo:** verifica regolarità (anticipo già incassato).

Nel gestionale:
1. Sulla pratica → **+ Emetti fattura** (tipo *SAL* o *Finale*).
2. Con la fattura finale la pratica passa a **Chiusa**.
3. La cronologia completa resta consultabile in **🕓 Storico completo** (archiviazione e storico interventi).

---

## In sintesi: gli stati della pratica

```
Richiesta → Offerta → Accettata
   → (Bordo) Attesa pagamento → Materiale in arrivo
   → (Cantiere) Materiale in arrivo
→ Pianificata → In esecuzione → Chiusura tecnica → Da fatturare → Chiusa
```

Ogni pratica mostra in alto la **barra del flusso** con lo step attuale e il suggerimento sulla prossima azione da fare.
