# GulpUI Web - LLM Guidelines & Context

Queste linee guida servono per allineare gli agenti AI (come Gemini) all'architettura e agli obiettivi di performance del progetto GulpUI Web.

---

## Architettura e Obiettivi Principali

Questo progetto gestisce grandissime moli di dati (centinaia di migliaia di eventi, source, document e note).
L'obiettivo critico è mantenere una **UI fluida a 60fps** e abbattere il consumo di memoria (attualmente instabile fino a 2GB).

---

## Regole Architetturali Rigide (Strict Rules)

### 1. Gestione dello Stato Globale (React Context)

Non inserire MAI stati ad alta frequenza di mutazione (come **scrollX** o **scrollY**) all'interno di Context generici (es. `Application.context.tsx`).

- Usa **Zustand**, store atomici (Jotai) o sottoscrizioni basate su `useRef` per i dati ad alto frame-rate.
- Il megastato `app` deve essere affettato (slice) per evitare il re-render di massa.

### 2. Divieto di useEffect a cascata

Sono rigorosamente vietati i cicli di `useEffect` usati per derivare o sincronizzare lo stato tra componenti distanti (es. aggiornamento indici in `Note.Entity`).

- Preferire **useMemo** per i dati derivati a livello locale.
- I ricalcoli massivi (indicizzazione, filtering) devono avvenire fuori dai cicli di render di React.

### 3. Engine Grafico (PixiJS)

Tutto il rendering dei dati visivi (timeline, eventi) sta migrando da un canvas singolo a piu canvas separati per avere performace migliori

- Nessun aggancio tra il re-render di React e i frame di animazione del Canvas.
- Delegare computazione di bounding-box, hit-testing e rendering direttamente al motore Pixi.

### 4. Main Thread e Web Workers

Le operazioni sincrone bloccanti sul thread principale sono vietate.

- Spostare su **Web Worker** l'elaborazione di array pesanti (ordinamento, ricerca binaria, parsing profondo).
- Implementare rigorosamente meccanismi di **Lazy Loading** e **Virtualization** nei componenti UI classici (liste, tabelle, menù).

## Regole di scrittura codice

### 1. Codice

- se vedi che un metodo è troppo lungo, spezzalo in metodi piu piccoli e riutilizzabili.
- se vedi che un metodo è troppo complesso, spezzalo in metodi piu piccoli e riutilizzabili.
- abraccia la filosofia di "less is more", non complicare le cose inutilmente.
- non usare librerie esterne se non strettamente necessario o se ti viene richiesto.

### 2. Commenti

Scrivi sempre i commenti in lingua inglse, ogni metodo deve avere una summary che spieghi cosa fa, i parametri che riceve e cosa restituisce.
All'interno di metodi piu complessi usa i commenti inline per spiegare cosa succede e perche viene fatto in quel modo.

## TEST

se decidi di procedere con dei test puoi accedere alla ui tramite il link http://localhost:3000 e chiedermi di portarti nella pagina dove sono state implementate le modifiche.
