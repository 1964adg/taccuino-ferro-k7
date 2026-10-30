# Prompt per Claude Code — Tappa 6: notifiche di fine recupero (server Cloudflare) e vibrazione

> Da incollare in una **nuova chat** di Claude Code aperta nella cartella `D:\GaiaGym`.

---

## Contesto

Stai lavorando su **Gaia Gym**, una PWA per tracciare gli allenamenti in palestra, usata su iPhone (Safari, aggiunta alla schermata Home). L'app è già completa e pubblicata su GitHub Pages: https://1964adg.github.io/taccuino-ferro-k7/ (repository `1964adg/taccuino-ferro-k7`, versione attuale in `service-worker.js` → `APP_VERSION`).

Prima di fare qualsiasi cosa **leggi per intero**:
- `CLAUDE.md`: regole del progetto, architettura, modello dati, limiti iOS noti;
- `Doc/diario-lavori.md`: tutte le decisioni prese e la storia delle versioni;
- `Doc/1° prompt`: la specifica originale.

Le regole di `CLAUDE.md` valgono anche qui:
- niente valori hardcodati: tutto passa da `js/config-default.js` e `js/settings-schema.js`;
- tutto in italiano;
- percorsi relativi;
- nessun dato personale nel codice;
- aumentare `APP_VERSION` a ogni pubblicazione e aggiornare `FILES` in `service-worker.js` (verifica con `node tools/check-sw.mjs`).

## Problema da risolvere

1. **Schermo bloccato**: con il telefono bloccato iOS sospende l'app, quindi il timer di recupero non può suonare. Oggi la soluzione è tenere lo schermo acceso (Wake Lock), che funziona.
2. **Vibrazione**: iOS non permette la vibrazione alle app web. `navigator.vibrate` non esiste, e il trucco dello switch di iOS 18 è stato provato e non funziona. È stato rimosso.
3. **Speranza**: le **notifiche** su iPhone fanno vibrare il telefono, se la vibrazione è attiva in Impostazioni iPhone → Suoni e feedback aptico. Quindi una notifica a fine recupero potrebbe dare sia l'avviso a schermo bloccato sia la vibrazione.

## Obiettivi, in quest'ordine

### A. Lampeggio dello schermo a fine recupero (sicuro, senza server)
- A fine recupero, un lampeggio a tutto schermo del colore di successo, ben visibile con la coda dell'occhio.
- Configurabile: attivo sì/no, durata e numero di lampeggi. Rispettare `prefers-reduced-motion`.

### B. Notifica locale a fine recupero, senza server (sperimentale)
- Richiesta del permesso alle notifiche con un tocco esplicito, dalle Impostazioni (su iOS deve partire da un gesto, e funziona solo con l'app aggiunta alla Home, iOS 16.4 e successivi).
- A fine recupero, se il permesso c'è: `registration.showNotification(...)` dal service worker, con testo configurabile, per esempio "Recupero finito · {esercizio}, serie {n}".
- **Da verificare sull'iPhone**: se iOS mostra la notifica (e fa vibrare) anche con l'app aperta e in primo piano. Se non la mostra, documentarlo e tenere solo la parte server (C).
- Gestire `notificationclick` in modo che riporti all'app aperta.

### C. Notifiche push con server Cloudflare (schermo bloccato)
Decisioni già prese con l'utente (vedi diario, domande 20–25):
- **Cloudflare Workers**, piano gratuito. L'utente crea l'account e **incolla il codice nel pannello web** di Cloudflare, senza terminale. Il codice del server va in `server/` nel repository, in un unico file autosufficiente: niente pacchetti npm, solo Web Crypto.
- **Programmazione**: una piccola sveglia per telefono. Proposta iniziale: un Durable Object con `alarm()`. **Verifica prima** che i Durable Objects si possano creare e collegare **solo dal pannello web, senza wrangler**, sul piano gratuito. Se non si può, proponi all'utente l'alternativa più semplice, prima di scrivere codice.
- **Flusso**:
  - a "Fatto" (inizio recupero) l'app manda al server `{ subscription, fireAt, timerId }`;
  - "±15 s" o "Salta" spostano o annullano la sveglia, inviando un nuovo `timerId` o una cancellazione;
  - alla scadenza il server invia la push via Web Push, con firma VAPID ES256 e cifratura del contenuto aes128gcm (RFC 8291), implementate con Web Crypto.
- **Sicurezza**: chiave segreta condivisa (Impostazioni → `push.secret`), richieste accettate solo dall'origine del sito, limiti di frequenza minimi. Al server arrivano solo l'indirizzo push e l'orario, nessun dato di allenamento.
- **Chiavi VAPID**: fornire un modo semplice per generarle, per esempio un piccolo strumento in `tools/` oppure una pagina usa e getta. La chiave privata va **solo** nelle variabili segrete del Worker, mai nel repository pubblico.
- **App**:
  - le impostazioni `push.enabled`, `push.serverUrl`, `push.secret` esistono già ma non fanno nulla: collegarle;
  - iscrizione con `pushManager.subscribe` e gestione degli eventi `push` e `notificationclick` nel service worker;
  - se il server non risponde o manca la rete (palestra in seminterrato), il timer locale resta il riferimento e non si mostra nessun errore invasivo.
- **Doppi avvisi**: in origine si era deciso di non notificare con l'app aperta e lo schermo acceso. Ora l'obiettivo include la vibrazione, quindi rendilo configurabile: "Notifica anche con l'app aperta", con default da decidere dopo il test sull'iPhone.

### D. Facoltativo, da chiedere all'utente prima di farlo
- Backup automatico su Cloudflare R2 a fine allenamento (opzione 3 discussa). I dati uscirebbero dal telefono: chiedere esplicitamente.

## Come voglio che lavori

1. **Prima di scrivere codice**:
   - leggi i documenti indicati sopra;
   - verifica con fonti aggiornate cosa è davvero possibile oggi su iOS (notifiche locali con app in primo piano, Web Push nelle PWA) e su Cloudflare dal solo pannello web (Durable Objects, variabili segrete);
   - segnalami subito limiti e ambiguità, e proponi il piano. Aspetta la mia conferma.
2. **Procedi per tappe**: prima A, poi B (che posso provare subito sull'iPhone), poi C.
3. **Istruzioni per Cloudflare**, nel README (sezione nuova) e in un file `server/ISTRUZIONI.md`, per una persona non tecnica: creare l'account, creare il Worker, incollare il codice, impostare le variabili segrete e i collegamenti, ottenere l'indirizzo, inserirlo nell'app. Passo per passo, con i nomi esatti dei pulsanti.
4. **A ogni tappa** dimmi cosa caricare su GitHub (aumentando `APP_VERSION`), cosa provare sull'iPhone e come.
5. **Prove**: testa nel browser quello che puoi (Chrome headless). Dimmi chiaramente cosa invece si può verificare solo sull'iPhone.
6. **Documentazione**: aggiorna `CLAUDE.md` e `Doc/diario-lavori.md` alla fine di ogni tappa.
