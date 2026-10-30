# Gaia Gym

Diario di allenamento in palestra per iPhone, come app web installabile (PWA).
Nessun server, nessun account, nessun abbonamento: i dati restano sul telefono, e i backup si salvano in un file.
Funziona anche senza connessione.

> Il diario delle decisioni e delle tappe è in [Doc/diario-lavori.md](Doc/diario-lavori.md).

## Provare l'app sul computer

Serve un piccolo server locale: aprendo `index.html` direttamente con doppio clic i moduli JavaScript non partono.

1. Apri un terminale nella cartella del progetto.
2. Avvia il server:
   ```
   python -m http.server 8000
   ```
3. Apri `http://localhost:8000` nel browser.
4. Per vederla come su iPhone: in Chrome o Edge premi F12, poi l'icona del telefono (modalità dispositivo).

Su `localhost` funziona anche il salvataggio offline. Dopo aver modificato il codice, ricarica con **Ctrl+F5**. Se la versione salvata non cambia: F12 → Application → Service workers → **Unregister**, poi ricarica.

### Provarla subito sull'iPhone (facoltativo)

Con PC e iPhone sulla stessa rete Wi-Fi:

1. Avvia il server così: `python -m http.server 8000 --bind 0.0.0.0`
2. Trova l'indirizzo IP del PC (in Windows: `ipconfig`, voce "Indirizzo IPv4", per esempio `192.168.1.20`).
3. Su iPhone apri Safari su `http://192.168.1.20:8000`.

Senza HTTPS iOS disattiva alcune funzioni: funzionamento offline, schermo sempre acceso, protezione dei dati. La prova completa si fa dopo la pubblicazione su GitHub Pages, che usa HTTPS.

## Pubblicare su GitHub Pages (gratis)

Nome del repository proposto: **`taccuino-ferro-k7`** (poco ovvio da indovinare).

### 1. Creare il repository

1. Accedi a [github.com](https://github.com) (o crea un account gratuito).
2. In alto a destra tocca **+** → **New repository**.
3. **Repository name**: `taccuino-ferro-k7`.
4. Visibilità: **Public**. Sul piano gratuito Pages funziona solo con repository pubblici.
5. Non spuntare nulla in "Initialize this repository with". Premi **Create repository**.

### 2. Caricare i file

1. Nella pagina del repository appena creato, tocca il link **uploading an existing file**, oppure **Add file → Upload files**.
2. Dal computer apri la cartella del progetto, seleziona **tutto il suo contenuto** (non la cartella stessa) e trascinalo nella pagina. Devono comparire `index.html`, `styles.css`, `service-worker.js`, `manifest.webmanifest`, `.nojekyll` e le cartelle `js` e `icons`.
   - Le cartelle `Doc` e `tools` e i file `README.md` e `CLAUDE.md` non servono all'app: puoi caricarli (per tenere tutto insieme) oppure no.
   - Se `.nojekyll` non si vede, in Esplora file attiva Visualizza → Elementi nascosti.
3. In basso premi **Commit changes**.

### 3. Attivare Pages

1. Nel repository vai su **Settings** (in alto) → **Pages** (menu a sinistra).
2. In **Build and deployment**, "Source": **Deploy from a branch**.
3. "Branch": **main**, cartella **/ (root)**. Premi **Save**.
4. Aspetta uno o due minuti e ricarica la pagina: in alto compare **"Your site is live at"** con l'indirizzo, del tipo
   `https://TUO-NOME-UTENTE.github.io/taccuino-ferro-k7/`

Tutti i percorsi dell'app sono relativi, quindi funziona anche da questa sottocartella.

### Pubblicare una nuova versione

**I dati non si perdono con un aggiornamento.** L'aggiornamento sostituisce solo i file dell'app; schede, allenamenti, peso e impostazioni stanno in un archivio separato che non viene toccato. Se una versione futura cambia il formato dei dati, l'app li converte da sola al primo avvio. Per prudenza, soprattutto all'inizio, **esporta un backup prima di aggiornare**.

Cosa invece cancella i dati sull'iPhone:
- **eliminare l'icona dell'app dalla Home**: iOS cancella anche i dati dell'app; per riordinare la Home spostala, non eliminarla;
- **cambiare l'indirizzo del sito** (rinominare il repository o cambiare nome utente GitHub): per iOS diventa un'app nuova e vuota;
- **non usare l'app per mesi**: iOS potrebbe liberare spazio.

In tutti questi casi si recupera tutto importando l'ultimo backup.

Passi per pubblicare:

1. Apri `service-worker.js` e, in cima, aumenta il numero in `const APP_VERSION = '…'` (per esempio da `1.0.4` a `1.0.5`). **Va fatto a ogni pubblicazione**: l'iPhone si accorge di una versione nuova solo se cambia questo file.
2. Se hai aggiunto o tolto file dell'app, aggiorna l'elenco in `service-worker.js`. Per controllarlo: `node tools/check-sw.mjs`.
3. Ricarica su GitHub i file cambiati (Add file → Upload files → Commit changes).
4. Aspetta qualche minuto: GitHub impiega fino a una decina di minuti a distribuire i file nuovi.
5. Sull'iPhone, alla riapertura successiva dell'app compare **"Nuova versione disponibile"**. Tocca **Aggiorna**. L'aggiornamento non parte mai da solo, per non interrompere un allenamento. In Impostazioni → Informazioni c'è anche **Controlla aggiornamenti**.

### Privacy

Il repository è pubblico: chiunque veda il tuo profilo GitHub può trovarlo e vedere il codice. Per questo nel codice non c'è nessun dato personale, e la scheda di esempio è generica. **I tuoi allenamenti non vanno mai su GitHub**: restano solo sul telefono e nei backup che salvi tu.

## Installare su iPhone

1. Apri l'indirizzo in **Safari** (non in altri browser).
2. Tocca il tasto **Condividi** (il quadrato con la freccia verso l'alto).
3. Scorri e scegli **Aggiungi alla schermata Home**. Qui puoi anche cambiare il nome sotto l'icona.
4. Da quel momento apri l'app dall'icona sulla Home: si apre a tutto schermo e funziona anche offline.

Importante: i dati dell'app aperta dall'icona sono **separati** da quelli del sito aperto in Safari. Usa sempre l'icona. Se hai fatto prove in Safari, esporta un backup da lì e importalo nell'app.

## Backup

Tutto si trova in **Impostazioni → Backup e dati**.

### Fare un backup

1. Tocca **Esporta backup**.
2. Si apre il menu di condivisione di iOS: scegli **Salva su File**.
3. Scegli la cartella **iCloud Drive** (per esempio una cartella "Gaia Gym") e tocca **Salva**.

Il file si chiama `gaia-gym-backup-AAAA-MM-GG-OOMM.json` e contiene tutto: schede, esercizi, allenamenti, peso corporeo e impostazioni.

### Ripristinare un backup

1. Tocca **Importa backup** e scegli il file da iCloud Drive.
2. L'app controlla il file e mostra cosa contiene.
3. Scegli:
   - **Unisci**: aggiunge i dati del file a quelli presenti; se un elemento esiste in entrambi, vince la versione modificata più di recente; le impostazioni del telefono restano;
   - **Sostituisci tutto**: usa solo i dati del file, impostazioni comprese.

### Backup automatici: cosa fa l'app da sola

iOS non permette a un'app web di salvare file su iCloud senza un tocco. Per questo il backup si divide in due parti:

| | Dove finisce | Serve un tocco? | Protegge da |
|---|---|---|---|
| **Backup a fine allenamento** (ogni 7 giorni) | file in **iCloud Drive**, nella cartella che scegli | sì, uno: "Salva backup" | perdita dei dati dell'app (icona eliminata, pulizia di iOS, telefono nuovo) |
| **Copie interne periodiche** (ogni 3 giorni, ne tiene 3) | dentro l'app, sul telefono | no | errori: cancellazioni sbagliate, importazioni non volute |
| **Copie prima delle importazioni** (ne tiene 3) | dentro l'app, sul telefono | no | un'importazione o un ripristino sbagliati |

Le copie interne si trovano in Impostazioni → Backup e dati → **Copie automatiche**, e da lì si torna indietro con un tocco. Tutti gli intervalli si cambiano in Impostazioni → Backup.

### Altro

- **Esporta cronologia (CSV)**: una riga per serie, da aprire con Numbers o Excel.
- **Promemoria**: se è passato troppo tempo dall'ultimo backup (7 giorni di default), anche la Home mostra un avviso con "Esporta ora".
- **Cambio di telefono**: esporta il backup sul vecchio, installa l'app sul nuovo e importa il file.

### Avviso importante

iOS può cancellare i dati di un sito web che non viene usato per molto tempo. L'app chiede al sistema di proteggerli, ma la garanzia non è assoluta. **Esporta un backup su iCloud Drive ogni tanto**: l'app te lo ricorda dopo il numero di giorni scelto nelle Impostazioni.

## Limiti di iOS da conoscere

- **Schermo spento**: con lo schermo bloccato iOS sospende l'app, quindi il timer non può suonare. Durante l'allenamento l'app tiene lo schermo acceso (disattivabile nelle Impostazioni). Al ritorno il timer è comunque giusto, perché calcola il tempo dall'ora di inizio. Per avere l'avviso anche a schermo bloccato serve il server di notifica (sezione qui sotto).
- **Vibrazione**: iOS non la permette alle app web. Le **notifiche** però fanno vibrare il telefono, secondo le impostazioni dell'iPhone: per questo l'app può mandare una notifica a fine recupero (Impostazioni → "Notifiche e vibrazione"). Con l'app aperta la notifica parte dal telefono stesso, insieme al bip; a schermo bloccato serve il server.
- **Suono**: nelle Impostazioni scegli se si mescola alla musica (e rispetta il tasto silenzioso) o se suona anche col silenzioso.
- **Nome sotto l'icona**: si sceglie quando aggiungi l'app alla Home. Cambiarlo nelle Impostazioni modifica solo il titolo dentro l'app.

## Notifiche e vibrazione a fine recupero

1. Apri l'app **dall'icona sulla Home** (in Safari le notifiche non esistono).
2. **Prima esporta un backup**: se rifiuti il permesso per sbaglio, per richiederlo bisogna togliere e rimettere l'icona, e questo cancella i dati.
3. Impostazioni → riquadro **"Notifiche e vibrazione"** → **Attiva le notifiche** → **Consenti**.
4. **Prova notifica e vibrazione**: deve comparire un riquadro in alto e il telefono deve vibrare. Se non vibra, apri "Impostazioni dell'iPhone per la vibrazione" nello stesso riquadro.
5. Se senti due suoni a fine recupero (bip + notifica): Impostazioni → "Notifiche di fine recupero" → "Con la notifica, niente bip finale dell'app".

Senza server la notifica arriva **solo con l'app aperta**. Lampeggio dello schermo: Impostazioni → Timer di recupero.

## Notifiche a schermo bloccato (facoltativo, server Cloudflare)

Per ricevere l'avviso (con vibrazione) anche con lo schermo bloccato o mentre usi un'altra app, serve un piccolo server tuo, gratuito, su **Cloudflare Workers**. Si prepara una volta sola **dal sito di Cloudflare, senza terminale**: il codice da incollare è in [`server/gaia-gym-push.js`](server/gaia-gym-push.js) e le istruzioni passo per passo in [`server/ISTRUZIONI.md`](server/ISTRUZIONI.md).

In breve:
- al tocco di "Fatto" l'app dice al server "avvisami tra N secondi"; "+15 s", "−15 s" e "Salta" spostano o annullano la sveglia;
- alla scadenza il server manda una notifica push al telefono;
- al server arrivano **solo** l'indirizzo push del telefono e la durata del recupero: nessun dato di allenamento. Il testo della notifica lo compone il telefono;
- se il server non risponde o manca la rete, il timer del telefono funziona come sempre, senza messaggi di errore invasivi.

## Struttura del codice

```
index.html             pagina
styles.css             stili (colori e misure da variabili CSS)
service-worker.js      salvataggio dei file per l'uso offline e numero di versione (APP_VERSION)
manifest.webmanifest   nome, icone e colori per l'installazione
icons/                 icona (icon.svg è l'originale, i PNG sono generati)
js/
  main.js              avvio
  config-default.js    TUTTI i valori predefiniti, testi e scheda di esempio
  config.js            unione predefiniti + impostazioni utente, tema
  settings-schema.js   descrizione delle impostazioni mostrate a schermo
  db.js                unico accesso a IndexedDB, versione dello schema, migrazioni
  io.js                backup, importazione, CSV
  pwa.js               service worker e aggiornamenti
  util.js, format.js   utilità, unità di misura, date
  timer.js             timer di recupero (basato sull'ora di fine)
  feedback.js          suono, vibrazione (Android), lampeggio, schermo acceso
  notify.js            notifiche locali di fine recupero
  push.js              collegamento al server di notifica (push a schermo bloccato)
  domain/              modello dati, schede, allenamento, statistiche, cronologia, importazione da testo
  ui/                  componenti, editor, grafici, riordino, schermate
server/                server di notifica da incollare su Cloudflare (non fa parte dell'app)
  gaia-gym-push.js     codice del Worker
  ISTRUZIONI.md        come prepararlo, passo per passo
tools/                 strumenti per chi sviluppa (non servono all'app)
  check-sw.mjs         controlla l'elenco dei file del service worker
  render-icons.mjs     rigenera le icone PNG da icons/icon.svg
```

Per cambiare un valore predefinito modifica `js/config-default.js`. Ogni impostazione resta comunque modificabile dall'app.
