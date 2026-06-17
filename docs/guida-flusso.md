# Guida operativa — Flusso Service nel gestionale

Questa guida segue **punto per punto** lo schema del PDF "Flusso di lavoro Service" e spiega, per ogni passo, cosa fare nel gestionale.

> Promemoria veloce: il menu a sinistra ha tutte le sezioni (Pratiche, Preventivi, Clienti, Imbarcazioni, Ordini & Magazzino, Fatture, Calendario...). Ogni pratica ha la **barra del flusso** in alto e, nel riquadro *Stato attuale*, i pulsanti che la fanno avanzare lungo il flusso.

> Nota sulle voci: i nomi tra **grassetto** corrispondono esattamente alle etichette dei pulsanti e dei campi nel gestionale.

---

## 1. Ricezione richiesta Service

Arriva la richiesta dal **Bordo** (cliente privato) o dal **Cantiere**.

Nel gestionale:
1. Vai su **Pratiche** → **+ Nuova pratica**.
2. Seleziona il **Cliente \*** (se nuovo, crealo prima in **Clienti → Nuovo cliente**: nel campo **Tipo** scegli *Bordo* o *Cantiere*).
3. Seleziona l'**Imbarcazione** (o creala in **Imbarcazioni → Nuova imbarcazione**).
4. Compila: **Problema segnalato**, **Sede intervento**, **Tempistiche richieste**, **Tipo lavoro**.
5. Premi **Apri pratica**.

La pratica nasce in stato **Richiesta**.

---

## 2. Verifica archivio e preparazione offerta

Si controlla lo storico e si prepara l'offerta con ricambi, manodopera, trasferte, officina.

Nel gestionale:
1. Apri la pratica → pulsante **🕓 Storico completo** per vedere interventi e documenti precedenti dell'imbarcazione.
2. Nella pratica, riquadro Preventivi → **+ Nuovo preventivo**.
3. Apri il preventivo e usa **Aggiungi riga**: per ogni voce scegli il **Tipo** (*Ricambio / Manodopera / Trasferta / Officina / Altro*), poi **Descrizione**, **Codice**, **Qta**, **€ unit.**
   - Sulla **Descrizione** compaiono i suggerimenti dal **listino** del cantiere costruttore (autocomplete).
4. Quando è pronto, usa **🖨 Stampa / Esporta PDF** per inviarlo al cliente.
5. Premi **Segna come inviato**: la pratica passa a **Offerta**.

---

## 3. Ricezione accettazione preventivo

Il cliente accetta: **firma** (Bordo) oppure **ordine di acquisto / PO** (Cantiere).
Senza copia firmata non si procede.

Nel gestionale (dentro il preventivo, dopo averlo segnato come inviato):
1. In **Modalità** scegli *Firma* oppure *PO*.
2. (PO) inserisci il **Rif. PO**.
3. Carica il file nel campo **Documento firmato (PDF)** (PDF o immagine).
4. Premi **Segna accettato**.

Compare **✓ Accettato il…** con il link **📎 Scarica documento firmato**; la pratica passa ad **Accettata**.
> Se hai accettato senza allegato, puoi caricarlo dopo con il pulsante **Carica firmato**.

---

## 4. Apertura pratica sul gestionale

Tutti i dati confluiscono nella pratica.

Nel gestionale, sulla pratica trovi già: dati cliente, imbarcazione, l'offerta accettata (con copia firmata archiviata), il **Tipo lavoro**, e puoi assegnare i **tecnici** nel riquadro **Pianificazione interventi**.

---

## 5. Gestione amministrativa iniziale / condizioni di pagamento

Qui i due percorsi si separano. Il gestionale lo fa **in automatico** in base al tipo cliente.

**Cliente Bordo (privato):** serve l'anticipo totale.
1. Sulla pratica accettata compare il riquadro **Iter amministrativo Bordo**.
2. Premi **Genera proforma da preventivo accettato**: crea la proforma e porta la pratica in **Att. pagamento**.
3. Invia la proforma al cliente (la trovi nel riquadro **Fatture** della pratica).

**Cliente Cantiere:** vale il PO, fatturazione a fine lavoro.
- Dalla pratica accettata premi direttamente il pulsante di stato **→ Materiale in arrivo**: non serve incasso anticipato.

> Nota: sui clienti Bordo i pulsanti mostrano solo il percorso corretto (prima il pagamento), sui Cantieri si salta direttamente al materiale.

---

## 6. Ricezione pagamento e ordine ricambi

**Cliente Bordo:** registra l'incasso.
1. Nel riquadro **Iter amministrativo Bordo** → **Registra incasso** (**Importo €**, **Modalità**, **Riferimento**).
2. Quando l'incasso copre il totale, la pratica avanza **da sola** a **Materiale in arrivo**.

Ordine ricambi (entrambi):
- Vai su **Ordini & Magazzino** → **+ Nuovo ordine**: compila **Numero \***, scegli la **Pratica collegata** e il **Fornitore**, premi **Crea ordine**.
- ⛔ Per i clienti **Bordo** l'ordine al fornitore è **bloccato** finché la proforma non è incassata (te lo segnala con un avviso). Per i Cantieri è sempre consentito.

---

## 7. Pianificazione intervento

Si programma l'intervento in base a ricambi/tecnici/disponibilità.

Nel gestionale:
1. Sulla pratica, riquadro **Pianificazione interventi**: scegli **Tecnico**, **Sede**, **Data** e orari **Da/A** → **+ Assegna**.
2. Puoi vedere il quadro generale in **Calendario**.
3. Alla prima assegnazione la pratica passa a **Pianificata**.

---

## 8. Esecuzione intervento

Intervento a bordo o in officina, con report delle attività.

Nel gestionale:
1. Sulla pratica → **📋 Report interventi**.
2. Compila: attività svolte, ore, materiali utilizzati, eventuali anomalie, foto.
3. Se emerge una lavorazione **EXTRA**, segnala l'anomalia: genera un nuovo preventivo che riparte dal punto 2.

Porta la pratica a **In esecuzione** e poi a **Chiusura tecnica** con i pulsanti di stato del riquadro *Stato attuale*.

---

## 9. Chiusura tecnica

Si inviano al cliente report e certificati di fine lavoro.

Nel gestionale:
1. Verifica che il report sia completo.
2. Registra i certificati di fine lavoro sulla pratica.
3. Porta lo stato a **Chiusura tecnica**.
   (Per ora l'invio al cliente si fa manualmente — email automatica non ancora attiva.)

---

## 10. Fatturazione finale e chiusura pratica

**Cantieri:** SAL ed emissione fattura finale.
**Bordo:** verifica regolarità (anticipo già incassato).

Nel gestionale:
1. Sulla pratica, riquadro **Fatture** → **+ Emetti fattura** (tipo *SAL* o *Finale*).
2. Con la fattura finale la pratica passa a **Chiusa**.
3. La cronologia completa resta consultabile in **🕓 Storico completo**.

---

## In sintesi: gli stati della pratica

```
Richiesta → Offerta → Att. accettazione → Accettata
   → (Bordo) Att. pagamento → Materiale in arrivo
   → (Cantiere) Materiale in arrivo
→ Pianificata → In esecuzione → Chiusura tecnica → Da fatturare → Chiusa
```

Ogni pratica mostra in alto la **barra del flusso** con lo step attuale e, nel riquadro *Stato attuale*, il suggerimento sulla prossima azione da fare.
