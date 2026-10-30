# Gaia Gym — guida al progetto

PWA per tracciare gli allenamenti in palestra, pensata per Safari su iPhone (aggiunta alla Home).
Specifica originale: [Doc/1° prompt](Doc/1°%20prompt). Diario delle tappe e delle decisioni: [Doc/diario-lavori.md](Doc/diario-lavori.md).
Lingua: tutto in italiano (interfaccia, commenti, documentazione, risposte all'utente).

## Vincoli da rispettare sempre

- **Tecnologia**: HTML, CSS e JavaScript (moduli ES) senza framework, senza build step e senza CDN. Si pubblica così com'è su GitHub Pages.
- **Percorsi**: solo relativi (`./...`), perché il sito sta in una sottocartella (`utente.github.io/taccuino-ferro-k7/`).
- **Niente valori hardcodati**: ogni numero o testo che l'utente potrebbe voler cambiare va in `js/config-default.js` e si legge con `get('percorso')` o `t('etichetta')`. Se deve essere modificabile da schermo, si aggiunge anche in `js/settings-schema.js`. I testi delle etichette compaiono da soli nella sezione "Testi dell'interfaccia".
- **Colori e misure in CSS**: si usano le variabili (`--c-primary`, `--radius`, `--tap-min`...), impostate da `applyTheme()` in `config.js`.
- **Dati personali**: nessuno, né nel codice né negli esempi. Il repository è pubblico.
- **Accesso ai dati**: `js/db.js` è l'unico modulo che usa IndexedDB. Il resto passa da `js/domain/repo.js`, che tiene una copia in memoria.
- **Testo dinamico**: sempre come `textContent`, tramite `h()` in `js/ui/dom.js`. Mai `innerHTML` con dati dell'utente.
- **Errori**: ogni operazione asincrona dall'interfaccia va dentro `safe(() => ...)` (`js/ui/components.js`), che mostra un messaggio comprensibile.
- **Aiuto contestuale**: per spiegare una voce poco ovvia si usa `helpTip('chiave', titolo)`, `withHelp(testo, 'chiave')`, l'opzione `help` di `stepper()` o il terzo argomento di `field()` in `editors.js`. Il testo va in `labels.help_<chiave>` (una riga per paragrafo) e deve descrivere il comportamento reale: va verificato nel codice.

## Architettura

```
index.html, styles.css
service-worker.js         cache dei file per l'uso offline + APP_VERSION (unico punto della versione)
manifest.webmanifest      installazione sulla Home
js/main.js                avvio: db → config → repo → scheda di esempio → interfaccia → service worker
js/pwa.js                 registrazione del service worker, avviso "Aggiorna", versione
js/config-default.js      tutti i preset, le etichette e la scheda di esempio
js/config.js              preset + valori utente (un valore vuoto o non valido usa il preset), tema
js/settings-schema.js     descrizione delle impostazioni a schermo
js/db.js                  IndexedDB, SCHEMA_VERSION e MIGRATIONS
js/util.js, format.js     utilità; conversioni kg/lb, km/mi; date con i segnaposto dd/mmm/yyyy...
js/io.js                  backup JSON (prepare + share/download), validazione, unisci/sostituisci,
                          copie automatiche, CSV, promemoria di backup
js/timer.js               timer di recupero basato su endAt (Date.now), non sui tick
js/feedback.js            suoni (Web Audio), vibrazione (solo Android), lampeggio a fine recupero, Wake Lock
js/notify.js              notifiche locali di fine recupero (permesso, prova, testo), senza server
js/push.js                server di notifica: iscrizione push, sveglie (sveglia/annulla/prova),
                          "nota" con il testo per il service worker (Cache API gg-push-note)
server/gaia-gym-push.js   Cloudflare Worker da incollare nel pannello (Queues + D1, VAPID con Web Crypto)
server/ISTRUZIONI.md      preparazione del server passo per passo, per chi non è tecnico
js/domain/model.js        costruttori dei record, MEASURES, expandTargets, restFor
js/domain/repo.js         copia in memoria + salvataggio; uso degli esercizi
js/domain/workout.js      scelta del giorno, avvio, precompilazione, serie, chiusura
js/domain/stats.js        volume, 1RM (Epley/Brzycki), record, ultima volta
js/domain/programs.js     operazioni su schede, giorni e voci (copia, riordino, archivio)
js/domain/textImport.js   analisi della scheda scritta come testo
js/domain/history.js      periodi, filtri, serie per i grafici, riepiloghi, record, recomputeRecords()
js/ui/charts.js           grafici SVG (linea nel tempo, barre) senza librerie
js/ui/pictograms.js       pittogrammi degli esercizi (SVG 48×48 disegnati a mano), scelta automatica
                          con regole in config (exerciseIcons), foto dalla galleria ridotta a JPEG
js/ui/app.js              instradamento a hash (#/schermata/parametri), barra in basso
js/ui/components.js       pannelli dal basso, conferme, avvisi, stepper, toggle, safe()
js/ui/editors.js          editor di esercizio e voce, scelta esercizio, chip dei giorni
js/ui/sortable.js         trascinamento fatto a mano (pointer event) per i riordini
js/ui/setformat.js        testi compatti di serie e obiettivi
js/ui/views/*.js          home, workout, programs (+ library, import),
                          progress (+ progress-common, history, exercise-progress, body), settings
```

### Modello dati (IndexedDB)

- **Archivi**: `settings` ({id:'user', values}), `meta` ({key, value}: schemaVersion, seeded, persisted), `exercises`, `programs` (giorni e voci annidati), `sessions` (serie annidate), `active` ({id:'current', session}), `bodyweight`.
- **Record**: ognuno ha `id`, `createdAt`, `updatedAt`.
- **Unità interne**: peso sempre in **kg**, distanza in **metri**, tempi in **secondi**. Si converte solo per mostrarli.
- **Voce di un giorno**: `{exerciseId, sets, repsMin, repsMax, weightKg, durationSec, distanceM, restSec|null, warmupSets, custom[], notes}`. `custom[i]` personalizza la serie i.
- **Recupero effettivo**: quello della voce, altrimenti quello dell'esercizio, altrimenti `timer.defaultRestSec`.
- **Sessione**: copia i valori previsti (`targets`) al momento dell'avvio. Lo storico fa riferimento a `exerciseId`, quindi rinominare un esercizio aggiorna tutto lo storico.
- **Modifiche allo storico**: passano da `history.updateSession()` e `history.removeSession()`, che ricalcolano i record. `durationSec` salvato ha la precedenza su `endedAt - startedAt`.
- **Per cambiare lo schema**: aumentare `SCHEMA_VERSION` in `db.js` e aggiungere in `MIGRATIONS` una funzione **pura** `(data) => data`. Si applica sia al database sia ai backup importati. Se servono nuovi archivi, aumentare anche `IDB_VERSION` e aggiungere un blocco in `onupgradeneeded`.
- **Condivisione su Safari**: `navigator.share` va chiamata subito dopo il tocco. I file da condividere si preparano prima (`io.prepareBackup()`, `io.prepareCsv()`), mai dopo un `await` lungo nel gestore del tocco.

## PWA e pubblicazione

- **A ogni pubblicazione**: aumentare `APP_VERSION` in `service-worker.js`. Safari (iOS) rileva un aggiornamento **solo se cambia il file del service worker**, non i file importati con `importScripts`: per questo la versione sta lì (prima stava in `version.js` e l'iPhone non vedeva gli aggiornamenti). La pagina legge la versione chiedendola al service worker (`pwa.appVersion()`).
- **File aggiunti o rimossi**: aggiornare l'elenco `FILES` in `service-worker.js` e verificare con `node tools/check-sw.mjs`.
- **Aggiornamenti**: non si attivano mai da soli. Passano dall'avviso "Aggiorna" (`js/pwa.js`), per non interrompere un allenamento.
- **Icone**: si modifica `icons/icon.svg`, poi si rigenerano i PNG con `node tools/render-icons.mjs <porta>` (server locale acceso).
- **Repository di pubblicazione**: `taccuino-ferro-k7` su GitHub Pages, branch `main`, cartella principale.

## Come provare

- **Server locale**: `python -m http.server 8000` dalla cartella, poi http://localhost:8000.
- **Controllo sintassi**: `node --check` su ogni file in `js/`.
- **Prova automatica**: Chrome headless pilotato via CDP con uno script Node, schermo 390×844. Si usa per fare screenshot e intercettare gli errori in console.

## Limiti di iOS noti (non riaprire senza motivo)

- **Vibrazione**: `navigator.vibrate` non esiste su iOS. Il trucco dello switch di iOS 18 è stato provato sull'iPhone dell'utente e **non funziona**: rimosso, insieme alla sua impostazione. `haptic()` usa `navigator.vibrate` solo dove c'è (Android).
- **Schermo bloccato**: niente notifiche locali programmate. Il comportamento predefinito è tenere lo schermo acceso (Wake Lock). La notifica via server Cloudflare è un'opzione prevista per la tappa finale (`push.*` nella configurazione).
- **Notifiche locali** (`js/notify.js`): esistono solo nell'app aperta dalla Home (in una scheda di Safari `Notification` non esiste). Il permesso si chiede con un tocco, senza `await` prima della richiesta. Partono solo mentre il JavaScript gira, quindi con l'app in primo piano. In background o a schermo bloccato serve la push dal server. Se il permesso viene rifiutato, per richiederlo di nuovo bisogna reinstallare l'icona, e reinstallarla cancella i dati.
- **Vibrazione tramite notifica**: la notifica non può chiedere di vibrare. Vibra o no secondo le impostazioni dell'iPhone (Notifiche → app, Suoni e feedback aptico, Full immersion). Chrome headless non mostra le notifiche: nelle prove si controllano le chiamate a `showNotification`.
- **Cloudflare dal solo pannello web**: i Durable Object nuovi richiedono una migrazione, che si fa solo con `wrangler`. Per questo si usano Queues (con `delaySeconds`) + D1. Worker, D1 e segreti dal pannello sono documentati; per Queues la documentazione mostra solo `wrangler`, quindi i nomi dei pulsanti in `server/ISTRUZIONI.md` (punti 7–8) vanno confermati sul pannello vero.

## Notifiche push (server)

- **Push vuota**: il server conosce solo l'indirizzo push e il ritardo. Il testo lo prepara l'app (`push.saveNote`) nella cache `gg-push-note`, che non inizia con `gaia-gym-` e quindi non viene cancellata all'attivazione del service worker. Su iOS ogni push **deve** mostrare una notifica, altrimenti Safari revoca l'iscrizione.
- **Richieste al server**: POST con JSON in `text/plain` e il segreto nel corpo, così il browser non fa la richiesta preliminare CORS. L'origine si confronta con `ORIGINE`.
- **Sveglie**: "Fatto" e "±15 s" inviano `sveglia` con un nuovo `idSveglia`, che sostituisce il precedente (la coda consegna solo se l'id combacia ancora in D1). "Salta" e la fine dell'allenamento inviano `annulla`. La coda arrotonda per difetto; il consumatore aspetta il resto.
- **Doppio avviso**: con l'app in primo piano e la notifica locale attiva, negli ultimi `push.cancelBeforeEndSec` secondi la sveglia del server si annulla. Se l'app passa in background prima della fine, si riprogramma (`keepalive`).
- **Errori**: mai avvisi invasivi. L'esito dell'ultimo invio si vede nel riquadro "Server di notifica".
- **Prove**: il Worker si prova in Node simulando D1 (`node:sqlite`), la coda e il servizio push. Chrome headless non ha un servizio push vero: si simula `PushManager` e si consegna una push con CDP (`ServiceWorker.deliverPushMessage`).
- **Dati separati**: i dati di Safari e quelli dell'app installata sulla Home non sono condivisi.
- **Nome sotto l'icona**: si fissa all'installazione e il manifest è statico.
