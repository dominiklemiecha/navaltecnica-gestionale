# Guida di test — Flusso Service passo passo

Questa guida segue **gli stessi 10 punti** di `guida-flusso.md`, ma in versione **collaudo**: per ogni passo trovi *cosa cliccare* e *cosa deve succedere* (la verifica ✅). I nomi tra **grassetto** sono identici alle etichette del gestionale.

> **Prima di iniziare**
> - Apri **https://navaltecnicav2.connecteed.com** e accedi con `admin@navaltecnica.it`.
> - Usa dati finti: scrivi **TEST** nei nomi, così a fine prova li riconosci e li puoi cancellare.
> - Per provare il flusso **completo** (con proforma e incassi) crea un cliente di **Tipo Bordo**.
> - Ti serve un **PDF qualsiasi** sul computer (simula l'offerta firmata dal cliente).

---

## 1. Ricezione richiesta Service

**Come farlo:**
1. Menu → **Clienti** → **Nuovo cliente**. In **Ragione sociale \*** scrivi `TEST Cliente`, in **Tipo** scegli **Bordo**, salva con **Crea cliente**.
2. Menu → **Imbarcazioni** → **Nuova imbarcazione**. Nome `TEST Barca`, collega `TEST Cliente`, salva con **Crea**.
3. Menu → **Pratiche** → **+ Nuova pratica**. Imposta **Cliente \*** = `TEST Cliente`, **Imbarcazione** = `TEST Barca`, e compila **Sede intervento**, **Tipo lavoro**, **Problema segnalato**, **Tempistiche richieste**. Premi **Apri pratica**.

**✅ Verifica:** si apre la scheda pratica con un codice (es. `0001/26`) e la **barra del flusso** sullo step **Richiesta**.

---

## 2. Verifica archivio e preparazione offerta

**Come farlo:**
1. Nella pratica, in alto, clicca **🕓 Storico completo** (sul TEST sarà vuoto: è normale).
2. Torna nella pratica → riquadro **Preventivi** → **+ Nuovo preventivo**.
3. Clicca il preventivo per aprirlo → riquadro **Aggiungi riga**: scegli **Tipo** (es. *Manodopera*), scrivi **Descrizione**, **Qta** `1`, **€ unit.** `100`, premi **+**. Aggiungi 1–2 righe (prova tipi diversi).
4. (Facoltativo) **🖨 Stampa / Esporta PDF** per vedere l'anteprima da inviare.

**✅ Verifica:** le righe compaiono nel riquadro **Righe** e il **totale** si aggiorna.

---

## 3. Ricezione accettazione preventivo

> ⚠️ Il modulo di accettazione **appare solo dopo** aver segnato il preventivo come inviato.

**Come farlo (dentro il preventivo):**
1. Premi **Segna come inviato**.

**✅ Verifica intermedia:** la pratica passa a **Offerta** e compare il modulo di accettazione.

2. In **Modalità** scegli *Firma* (per il Cantiere useresti *PO* + **Rif. PO**).
3. Carica il tuo **PDF** nel campo **Documento firmato (PDF)**.
4. Premi **Segna accettato**.

**✅ Verifica:** compare **✓ Accettato il…** con il link **📎 Scarica documento firmato** (cliccandolo il PDF si apre). La pratica è ora **Accettata**.
**🧪 Prova anche l'errore:** prima di caricare il PDF, prova con un file **.txt** → deve apparire **"Tipo file non ammesso"** e il preventivo NON viene accettato.

---

## 4. Apertura pratica sul gestionale

**Come farlo:** torna nella pratica e controlla che ci sia già tutto.

**✅ Verifica:** la scheda mostra **Cliente**, **Imbarcazione**, l'offerta accettata collegata e il riquadro **Pianificazione interventi**. La barra del flusso è su **Accettata**.

---

## 5. Gestione amministrativa iniziale (il bivio Bordo/Cantiere)

Il gestionale mostra il percorso giusto **in automatico** in base al **Tipo** cliente.

**Cliente Bordo (il nostro TEST):**
1. Nella pratica accettata compare il riquadro **Iter amministrativo Bordo**.
2. Premi **Genera proforma da preventivo accettato**.

**✅ Verifica:** la pratica passa ad **Att. pagamento** e nel riquadro **Fatture** della pratica compare una proforma.

> **Se fosse un Cantiere:** niente riquadro Bordo; troveresti direttamente il pulsante di stato **→ Materiale in arrivo**. Puoi verificarlo creando un secondo cliente di **Tipo Cantiere**.

---

## 6. Ricezione pagamento e ordine ricambi

**Prima prova il blocco (gate):**
1. Menu → **Ordini & Magazzino** → **+ Nuovo ordine**. Metti un **Numero \***, scegli la **Pratica collegata** `TEST`, premi **Crea ordine**.

**✅ Verifica:** l'ordine viene **rifiutato** con un avviso (proforma non ancora incassata). Giusto così.

**Registra l'incasso:**
2. Torna nella pratica → **Iter amministrativo Bordo** → **Registra incasso**: **Importo €** parziale (es. `100`), **Modalità** `bonifico`, conferma.

**✅ Verifica:** resta in **Att. pagamento** e mostra il **Residuo**.
3. Registra un secondo incasso che copre il **saldo**.

**✅ Verifica:** la pratica avanza **da sola** a **Materiale in arrivo**.

**Ora l'ordine è sbloccato:**
4. Menu → **Ordini & Magazzino** → **+ Nuovo ordine** → **Numero \***, **Pratica collegata** `TEST`, **Fornitore**, **Crea ordine**.

**✅ Verifica:** stavolta l'ordine viene creato e ti porta nella lista ordini.

---

## 7. Pianificazione intervento

**Come farlo:**
1. Nella pratica → riquadro **Pianificazione interventi**: scegli **Tecnico**, **Sede**, **Data** (e **Da/A** se vuoi) → **+ Assegna**.
2. Menu → **Calendario** per il quadro generale.

**✅ Verifica:** l'assegnazione compare nell'elenco e nel Calendario; la pratica passa a **Pianificata**.

---

## 8. Esecuzione intervento

**Come farlo:**
1. Nella pratica, in alto, clicca **📋 Report interventi**.
2. Compila attività, ore, materiali, eventuali anomalie, foto.
3. Nel riquadro **Stato attuale** avanza con i pulsanti **→ In esecuzione**, poi **→ Chiusura tecnica**.

**✅ Verifica:** il report è salvato e gli stati avanzano nella barra del flusso.
> **EXTRA:** se emerge un lavoro non previsto, lo segnali come anomalia → genera un nuovo preventivo che riparte dal punto 2.

---

## 9. Chiusura tecnica

**Come farlo:**
1. Verifica che il **📋 Report interventi** sia completo.
2. Registra i certificati di fine lavoro sulla pratica.
3. Porta lo stato a **Chiusura tecnica**.

**✅ Verifica:** lo stato è **Chiusura tecnica**.
> Nota: l'invio automatico via email al cliente **non è ancora attivo**.

---

## 10. Fatturazione finale e chiusura pratica

**Come farlo:**
1. Nella pratica → riquadro **Fatture** → **+ Emetti fattura** (tipo *SAL* o *Finale*).
2. Compila ed emetti.

**✅ Verifica:** la fattura compare nella lista e, con la fattura finale, la pratica passa a **Chiusa**. La cronologia resta in **🕓 Storico completo**.

---

## Pulizia finale

Quando hai finito, cancella (o lascia, sono riconoscibili) i dati **TEST**: pratica, cliente, imbarcazione, ordini e fatture di prova.

---

## Riepilogo stati attesi

```
Richiesta → Offerta → Att. accettazione → Accettata
   → (Bordo) Att. pagamento → Materiale in arrivo
   → (Cantiere) Materiale in arrivo
→ Pianificata → In esecuzione → Chiusura tecnica → Da fatturare → Chiusa
```

Se in un punto **non trovi** il pulsante con quel nome esatto, o il comportamento è diverso da quello atteso, annota *quale punto* e *cosa vedi*: si verifica nel codice e si sistema.
