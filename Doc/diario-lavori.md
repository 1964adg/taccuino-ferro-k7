# Diario dei lavori — Gaia Gym

Traccia delle decisioni prese e delle tappe completate. Aggiornare a ogni tappa.

## Decisioni concordate (30/10/2026)

### Limiti di iOS discussi

- **Vibrazione**: non disponibile. C'è un trucco iOS 18 come opzione sperimentale, disattivata di default.
- **Notifica a schermo spento**: impossibile senza server. Predefinito: schermo sempre acceso durante l'allenamento. In più, come **opzione**, una notifica tramite **Cloudflare Workers**, prevista nella tappa finale. Il codice del server va **incollato nel pannello web** di Cloudflare.
- **Suono**: funziona solo con l'app in primo piano. La modalità audio è configurabile: "si mescola alla musica" oppure "suona anche col silenzioso".
- **Nome sotto l'icona della Home**: si fissa all'installazione.
- **Dati**: quelli dell'app installata sono separati da quelli di Safari. Il backup in file serve anche per spostarli.

### Risposte alle domande (punti A–F)

Tutte le proposte accettate, più queste scelte esplicite:

1. **Libreria esercizi**: i giorni contengono voci che puntano a esercizi della libreria, ciascuna con i propri valori previsti.
2. **Serie diverse tra loro**: sì. Di base sono tutte uguali, personalizzabili serie per serie.
3. **Superserie e circuiti**: non ora. Il modello dati deve poterli aggiungere in futuro.
4. **Tipi di misurazione**: peso + ripetizioni, solo ripetizioni, corpo libero + zavorra, tempo, distanza + tempo.
5. **Unità**: dati salvati sempre in kg, conversione solo a schermo.
6. **Serie di riscaldamento**: sì, facoltative ed escluse da volume e record (configurabile).
7. **Schede attive**: una sola alla volta.
8. **Rotazione**: il giorno che segue l'ultimo svolto.
9. **Precompilazione "dal massimo"**: peso massimo mai fatto con almeno le ripetizioni previste.
10. **Dopo l'ultima serie**: il recupero parte comunque e si passa da soli all'esercizio successivo (entrambe le cose configurabili).
11. **Tasto "Fatto"**: un tocco di default. In alternativa "tieni premuto" oppure "tocco + conferma".
12. **Preavviso**: a 10 secondi dalla fine del recupero, configurabile.
13. **Vibrazione sperimentale**: disattivata di default.
14. **Massimale stimato (1RM)**: formula di Epley, Brzycki come alternativa.
15. **Costanza**: allenamenti svolti rispetto ai giorni abilitati.
16. **Peso corporeo**: **sì, si traccia**. Si registra a fine allenamento e si usa nel volume degli esercizi a corpo libero.
17. **Unione all'importazione**: vince il record modificato più di recente.
18. **Importazione da testo**: formato `# Giorno [lun, gio]` e `Nome 4x8-10 60kg 90s`.
19. **Promemoria di backup**: dopo 7 giorni.
20. **Server Cloudflare**: codice incollato nel pannello web.
21. **Orario della notifica**: Durable Object con una sveglia, cioè un piccolo oggetto sul server per ogni telefono.
22. **Protezione del server**: chiave segreta, e richieste accettate solo dal sito.
23. **Testo della notifica**: configurabile.
24. **Notifica con app aperta e schermo acceso**: nessuna.
25. **Notifica**: arriva nell'ultima tappa.
26. **Nome del repository**: `taccuino-ferro-k7`.
27. **Architettura**: confermata.

## Piano delle tappe

1. ✅ Nucleo: configurazione, dati, scheda di esempio, Home, allenamento con timer, Impostazioni.
2. ✅ Schede e programmazione: editor, libreria, riordino, importazione da testo.
3. ✅ Cronologia e progressi: elenco modificabile, grafici SVG, record, riepiloghi, filtri, peso corporeo.
4. ✅ Esportazione e importazione: JSON (Web Share o download), unione o sostituzione, backup automatico, CSV, promemoria di backup.
5. ✅ Rifinitura grafica e PWA: manifest, service worker offline, icone, README completo per GitHub Pages.
6. ⏳ Vibrazione e notifiche di fine recupero: A lampeggio ✅, B notifica locale ✅ (da provare sull'iPhone), C push con Cloudflare (Queues + D1), con il codice in `server/`.

## Tappa 1 — Nucleo (completata)

- **Configurazione**: `config-default.js` con tutti i preset, `config.js` che li unisce ai valori dell'utente, impostazioni generate da `settings-schema.js` con ripristino per singola voce e totale.
- **Dati**: IndexedDB con versione dello schema e migrazioni, scheda di esempio caricata al primo avvio, richiesta di archiviazione protetta (`navigator.storage.persist`).
- **Home**: giorno di oggi o prossimo in rotazione, scelta di un altro giorno con un tocco, ultimo allenamento, tasto "Inizia" in basso.
- **Allenamento**:
  - un esercizio alla volta, con stepper grandi e precompilazione secondo la regola scelta;
  - tasto "Fatto" in tre modalità;
  - timer basato sull'ora di fine, con ±secondi e Salta;
  - annulla ultima serie, modifica di una serie fatta, serie extra, salta esercizio, esercizio fuori scheda;
  - ultima volta, record e nuovo record;
  - schermo sempre acceso;
  - salvataggio continuo e ripresa dopo la riapertura;
  - riepilogo finale con note e peso corporeo.
- **Correzioni dopo i test**:
  - elementi `[hidden]` che occupavano spazio;
  - sezioni compresse da flex;
  - doppia registrazione con tocchi rapidi;
  - pannello del recupero più compatto.

## Tappa 2 — Schede e programmazione (completata)

- **Elenco schede**: crea, rendi attiva, duplica, rinomina, note, archivia, elimina (lo storico resta).
- **Dettaglio scheda**: giorni riordinabili con frecce e trascinamento dalla maniglia, aggiunta, giorni archiviati.
- **Dettaglio giorno**:
  - giorni della settimana a chip;
  - esercizi riordinabili;
  - editor della voce: serie, riscaldamento, ripetizioni min/max, peso, tempo, distanza, recupero proprio o predefinito, serie personalizzate una per una, note;
  - rimozione con "Ripristina".
- **Libreria esercizi**:
  - ricerca, raggruppamento per gruppo muscolare;
  - crea, modifica, duplica, archivia;
  - eliminazione solo se l'esercizio non è usato in nessuna scheda e non ha storico.
- **Importazione da testo**:
  - anteprima dal vivo, avvisi sulle righe non riconosciute, esercizi esistenti riconosciuti per nome;
  - legenda: `4x8-10`, `60kg`, `135lb`, `+5kg`, `3x45s`, `1x2km`, `90s`, `2:00`, `3min`, `1 risc`, `cl`, `[lun, gio]`, `// nota`, `Scheda: nome`.
- **Instradamento**: indirizzi interni `#/programs/p/<id>/d/<id>`, `#/programs/library`, `#/programs/import`. `ctx.render({ keepScroll: true })` ridisegna la pagina senza perdere la posizione.
- **Codice condiviso**: le funzioni di formattazione delle serie sono state spostate in `js/ui/setformat.js`.

## Tappa 3 — Cronologia e progressi (completata)

- **Schede interne di Progressi**: Riepilogo, Cronologia, Esercizi, Peso. Indirizzi `#/progress`, `#/progress/history`, `#/progress/session/<id>`, `#/progress/exercises`, `#/progress/exercise/<id>`, `#/progress/body`.
- **Riepilogo**:
  - settimana o mese: allenamenti, costanza (giorni allenati rispetto ai giorni abilitati fino a oggi, massimo 100%), volume totale, tempo totale;
  - grafico a barre degli ultimi N periodi, con allenamenti oppure volume;
  - medie del periodo mostrato.
- **Cronologia**:
  - filtri per periodo, giorno di allenamento ed esercizio (condivisi tra le schermate, finché l'app resta aperta);
  - allenamenti raggruppati per mese, "Mostra altri".
- **Dettaglio allenamento modificabile**:
  - data e ora, durata, peso corporeo, note;
  - serie (modifica, elimina, aggiungi), aggiunta o rimozione di esercizi, eliminazione dell'allenamento;
  - dopo ogni modifica `recomputeRecords()` ripercorre lo storico e ricalcola il segno di record.
- **Esercizi**:
  - elenco di quelli con storico;
  - dettaglio con grafico a linea per metrica: massimale stimato, peso massimo, volume, ripetizioni massime e totali, tempo, distanza (a seconda del tipo di misurazione);
  - record personali con la data, storico delle sessioni.
- **Peso corporeo**: grafico, variazione nel periodo, registrazioni modificabili ed eliminabili, nuova registrazione con data.
- **Grafici**: `js/ui/charts.js` in SVG scritto a mano. Ridisegno con `ResizeObserver`, lettura del valore al tocco, colori dalle variabili CSS.
- **Nuove impostazioni**: periodo iniziale, tipo di riepilogo, numero di periodi, metrica iniziale, altezza e stile dei grafici, formati delle date per assi e mesi.
- **Unificazioni**: un editor di serie condiviso (`editSetDialog` in `editors.js`) usato sia dall'allenamento sia dalla cronologia.
- **Correzioni**:
  - tema "Automatico" che partiva sempre chiaro;
  - durata del riepilogo che ignorava la durata corretta a mano.
- **Nota per i test (tappa 3)**: il browser può tenere in memoria file vecchi. Dopo un aggiornamento serve un ricaricamento forzato (Ctrl+F5). Con il service worker della tappa 5 la gestione delle versioni sarà esplicita.

## Tappa 4 — Esportazione e importazione (completata)

- **Modulo `js/io.js`**: backup JSON, validazione, importazione, CSV, copie automatiche, promemoria.
- **Formato del backup**: `{ format: 'gaia-gym-backup', schemaVersion, exportedAt, appName, data: { archivio: [record] } }`. Le chiavi di `meta` proprie del telefono (`autoBackups`, `persisted`, `lastExport`, `backupSnoozedUntil`) non finiscono nel file e non vengono sovrascritte all'importazione.
- **Esportazione**: Web Share API con file (su iPhone: "Salva su File" → iCloud Drive), con il download come alternativa. Il file è **preparato in anticipo** all'apertura della schermata, perché Safari apre la condivisione solo subito dopo un tocco. `lastExport` si aggiorna solo se l'esportazione non viene annullata.
- **Validazione**: JSON leggibile, formato riconosciuto, versione non più recente dell'app, archivi come array, record con id, controlli minimi su sessioni e schede. Ogni caso ha un messaggio di errore chiaro.
- **Migrazioni**: diventate funzioni pure sui dati (`db.migrateData`). Valgono sia per il database all'avvio sia per i backup di versioni precedenti.
- **Sostituisci tutto**: `db.replaceAll()` in un'unica transazione, quindi o va tutto a buon fine o non cambia niente. Impostazioni comprese.
- **Unisci**:
  - per id, vince il record con `updatedAt` più recente;
  - le impostazioni del telefono restano;
  - l'allenamento in corso del telefono ha la precedenza;
  - resta attiva una sola scheda.
- **Copie automatiche**: prima di ogni importazione o ripristino; se ne conservano N (`backup.autoBackupsKept`, 3 di default). Si ripristinano da Impostazioni → Backup e dati → Copie automatiche.
- **CSV**: una riga per serie. Separatore `;` e decimali con la virgola (configurabili), BOM per Excel, unità di peso e distanza quelle scelte.
- **Promemoria nella Home**: dopo `backup.reminderDays` giorni dall'ultimo backup (o dal primo allenamento, se non ce n'è mai stato uno), con "Esporta ora" e "Più tardi" (rimanda di `backup.snoozeHours` ore).
- **Prove fatte**:
  - esportazione JSON e CSV;
  - file non valido rifiutato;
  - unione: 32 → 34 allenamenti;
  - sostituzione: 29 → 34;
  - ripristino della copia automatica: 34 → 29;
  - tetto di 3 copie automatiche rispettato.

## Tappa 5 — Rifinitura e PWA (completata)

- **Icona**: `icons/icon.svg` è l'originale (manubrio bianco su viola sfumato, a tutto quadrato perché iOS arrotonda da solo). I PNG (180 apple-touch, 192, 512, 32 favicon) si generano con `node tools/render-icons.mjs <porta>`, con il server locale acceso.
- **Manifest**: `manifest.webmanifest` con `start_url` e `scope` relativi (`./`), display standalone, icone normali e maskable.
- **Versione**: `version.js` è uno script classico che imposta `self.APP_VERSION`. Lo leggono sia la pagina sia il service worker (con `importScripts`). **Va aumentata a ogni pubblicazione.**
- **Service worker** (`service-worker.js`):
  - salva in anticipo l'elenco `FILES` nella cache `gaia-gym-<versione>`, con `cache: 'reload'`;
  - risponde prima con la copia salvata, poi con la rete;
  - all'apertura dell'app restituisce sempre `index.html`;
  - all'attivazione cancella le cache vecchie.
  - `node tools/check-sw.mjs` verifica che l'elenco corrisponda ai file reali.
- **Aggiornamenti** (`js/pwa.js`):
  - una versione nuova si installa ma resta in attesa: compare "Nuova versione disponibile" con "Aggiorna" (`skipWaiting`, poi ricarica quando cambia il controller);
  - non parte mai da sola, per non interrompere un allenamento;
  - controllo automatico quando si torna all'app, e "Controlla aggiornamenti" nelle Impostazioni.
- **Impostazioni → Informazioni**: versione, stato dell'uso offline, controllo aggiornamenti.
- **Rifiniture**:
  - dissolvenza leggera al cambio di schermata;
  - meno spazio vuoto nei riquadri;
  - avvisi che restano finché non si toccano (`duration: 0`);
  - testi di accessibilità rimasti nel codice spostati nella configurazione;
  - `.nojekyll` per GitHub Pages.
- **README**: guida passo per passo per GitHub Pages (creazione del repository, caricamento, attivazione, indirizzo), pubblicazione di nuove versioni, installazione su iPhone, backup, limiti di iOS, struttura del codice.
- **Prove fatte**:
  - service worker attivo e cache `gaia-gym-1.0.0`;
  - **apertura senza rete** riuscita su tutte le schermate;
  - aggiornamento simulato 1.0.0 → 1.0.1: avviso, "Aggiorna", cache vecchia eliminata (versione poi rimessa a 1.0.0);
  - giro completo su un profilo pulito senza errori.

## Stato

L'app è completa e pubblicabile. Resta solo la **tappa 6 facoltativa** (notifiche con Cloudflare), da fare dopo aver usato l'app sull'iPhone.

## Aggiunta dopo la tappa 5 — Backup semi-automatici

- **Decisione dell'utente**: opzioni 1 + 2. Il backup davvero automatico su iCloud è impossibile, perché iOS richiede un tocco per salvare un file. L'opzione 3 (backup su server Cloudflare R2) si valuterà con la tappa 6.
- **1. Proposta a fine allenamento**:
  - dopo "Salva allenamento", se sono passati `backup.promptAfterWorkoutDays` giorni (7) dall'ultimo backup, o se non ce n'è mai stato uno, compare "Salva un backup";
  - il file è preparato prima del tocco;
  - "Salva backup" apre la condivisione (Salva su File → iCloud Drive).
- **2. Copie interne periodiche**:
  - all'avvio e a fine allenamento, se l'ultima copia ha più di `backup.periodicDays` giorni (3), l'app ne salva una in `meta.autoBackups` con motivo `periodic`, senza tocchi;
  - limiti separati: `backup.periodicKept` (3) per le periodiche, `backup.autoBackupsKept` (3) per quelle fatte prima delle importazioni.
- **Dove stanno i dati**:
  - dati dell'app e copie interne: IndexedDB, privato dell'app, perso se si elimina l'icona;
  - backup esportati: file in iCloud Drive, che sopravvivono a tutto.
- **README**: aggiunte le sezioni "I dati non si perdono con un aggiornamento" (con le cose che invece li cancellano) e "Backup automatici: cosa fa l'app da sola".

## Pubblicazione e primo riscontro sull'iPhone (versione 1.0.1)

- **Pubblicata** su https://1964adg.github.io/taccuino-ferro-k7/ (repository `1964adg/taccuino-ferro-k7`). Al primo caricamento mancavano le cartelle `js` e `icons`: il caricamento web di GitHub prende le cartelle solo se trascinate, non con "choose your files".
- **Riscontri**:
  - schermo sempre acceso: funziona;
  - backup su iCloud: funziona;
  - vibrazione: **non funziona**, quindi rimossa;
  - suoni: richiesto un 3-2-1 finale.
- **Fatto nella 1.0.1**:
  - **Conto alla rovescia 3-2-1**: un bip per ognuno degli ultimi `timer.countdownFrom` secondi (3), con cifre arancioni che pulsano; il preavviso a 10 secondi e il suono finale restano.
  - **Schermata di benvenuto**:
    - è già dentro `index.html`, quindi compare all'istante;
    - mostra icona, nome dell'app, "Ciao {nome}!" oppure "Buon allenamento!", e "by Papy" piccolo in basso a destra;
    - nessun tasto: si chiude da sola dopo `welcome.durationMs` (1800 ms), oppure con un tocco;
    - configurabile: attiva sì/no, durata, firma, colori della sfumatura;
    - durante l'avvio si nasconde solo `.app`, non tutto il `body`, altrimenti la schermata di benvenuto sarebbe invisibile.
- **Da decidere**: icone per gli esercizi (vedi proposta in chat).

## Versione 1.0.2 — Audio insieme alla musica

- **Problema segnalato**: avviando un lettore musicale, i bip non si sentivano più, nemmeno dopo aver spento la musica. Che il bip non interrompa la musica è invece voluto (modalità "ambient").
- **Causa**: su iOS l'AudioContext passa allo stato `interrupted` quando un'altra app prende l'audio. Il codice riattivava solo lo stato `suspended`. Inoltre, dopo un'interruzione, Safari a volte segna il canale come attivo ma resta muto.
- **Correzione** (`js/feedback.js`):
  - si tiene traccia delle interruzioni (`onstatechange`);
  - al tocco successivo l'AudioContext viene chiuso e ricreato, con un suono muto per riattivarlo dentro il gesto;
  - `resume()` per ogni stato diverso da `running`, anche al ritorno nell'app;
  - il tipo di sessione audio si riapplica a ogni ricreazione, quindi il cambio di modalità ha effetto subito.
- **Limite residuo**: se la musica parte durante un recupero senza toccare l'app, il bip finale di quel recupero può andare perso; dal tocco successivo l'audio torna.
- **Aggiunto**: tasto "Prova il suono" in Impostazioni → Informazioni.

## Versione 1.0.3 — Aggiornamenti non rilevati

- **Problema**: dopo la pubblicazione della 1.0.2, "Controlla aggiornamenti" rispondeva "aggiornata".
- **Causa**: GitHub Pages invia `Cache-Control: max-age=600`. Con l'impostazione predefinita (`updateViaCache: 'imports'`), il browser prende `version.js` (importato dal service worker) dalla propria cache per un massimo di 10 minuti. `service-worker.js` non cambia, quindi nessun aggiornamento viene visto.
- **Correzione**: registrazione con `updateViaCache: 'none'`. Ora il controllo scarica sempre `service-worker.js` e `version.js` dalla rete.
- **Nota**: resta un possibile ritardo di pochi minuti dovuto alla rete di distribuzione di GitHub subito dopo la pubblicazione. Il messaggio "aggiornata" ora mostra la versione e suggerisce di riprovare.

## Versione 1.0.4 — Aggiornamenti su iPhone (causa vera)

- **Problema**: anche con la 1.0.3 online, sull'iPhone "Controlla aggiornamenti" rispondeva sempre "aggiornata".
- **Causa**: Safari/WebKit decide se c'è un aggiornamento confrontando **solo il file `service-worker.js`**, non gli script importati con `importScripts`. La versione stava in `version.js`, quindi `service-worker.js` non cambiava mai. Chrome invece controlla anche gli import: per questo le prove sul PC funzionavano.
- **Correzione**:
  - `APP_VERSION` ora sta in cima a `service-worker.js` (unico punto); `version.js` eliminato;
  - la pagina chiede la versione al service worker tramite `MessageChannel` (`pwa.appVersion()`);
  - resta `updateViaCache: 'none'`.
- **Passaggio**: sull'iPhone c'è ancora il service worker vecchio, ma dato che `service-worker.js` ora cambia, lo rileva e si aggiorna alla 1.0.4. Il file `version.js` rimasto nel repository GitHub è innocuo (non è più usato) e si può eliminare.
- **Prova**: versione letta correttamente; cambiando solo `service-worker.js` (1.0.4 → 1.0.5) compare l'aggiornamento e dopo "Aggiorna" risulta 1.0.5 (numero poi rimesso a 1.0.4).

## Versione 1.0.5 — Icone degli esercizi

- **Scelta dell'utente**: opzione 1, cioè pittogrammi disegnati a mano più foto dalla galleria.
- **`js/ui/pictograms.js`**: 21 pittogrammi SVG (griglia 48×48, tratto 3, testa piena), nello stesso stile delle icone dell'app: trazioni, panca, squat, stacco, rematore, spinte, curl, tricipiti ai cavi, leg press, macchina gambe, polpacci, plank, addominali, dip, croci, affondi, corsa, bici, kettlebell, stretching, generico.
- **Campo `icon` dell'esercizio**:
  - assente o `auto`: scelto dalle regole di `exerciseIcons.rules` (parole nel nome, in ordine, con esclusioni) e poi da `exerciseIcons.groups` (gruppo muscolare);
  - `none`: nessuna icona;
  - una chiave di pittogramma;
  - `image`: foto in `ex.image`, ritagliata al centro e ridotta a 160 px in JPEG come data URL.
  Nessuna migrazione: i campi sono facoltativi.
- **Dove compaiono**: allenamento (grande, accanto al nome), giorni della scheda, libreria, scelta dell'esercizio, progressi per esercizio, dettaglio della cronologia.
- **Editor dell'esercizio**: campo "Icona" con anteprima e "Cambia icona", che apre una griglia con Automatica, Foto dalla galleria, Nessuna e tutti i pittogrammi.
- **Impostazione**: "Mostra le icone degli esercizi" (Allenamento).
- **Tema scuro**: contrasto delle icone aumentato.
- **Prova**: assegnazione automatica corretta sulla scheda di esempio, griglia di scelta, caricamento di una foto.

## Tappa 6 — Vibrazione e notifiche di fine recupero

### Verifiche e decisioni (30/10/2026)

- **Obiettivo dell'utente**: sentire il telefono vibrare a fine recupero. Le notifiche sono l'unico modo, perché su iOS la vibrazione la decide il sistema in base alle sue impostazioni.
- **Durable Object dal pannello web: non possibile.** La documentazione di Cloudflare (ottobre 2026) crea le classi nuove solo con una migrazione (`new_sqlite_classes` o `exports`) applicata da `wrangler deploy`. Il pannello non offre un modo documentato.
- **Scelta (confermata dall'utente)**: **Queues + D1**, entrambe nel piano gratuito (Queues dal febbraio 2026) e creabili dal pannello. Coda con `delaySeconds` pari al recupero. D1 tiene la sveglia valida per ogni telefono, per gestire "Salta" e "±15 s".
- **Push vuota (confermata)**: il server non riceve né invia dati di allenamento. Il service worker compone il testo leggendo l'allenamento in corso dal telefono. Niente cifratura RFC 8291; resta la firma VAPID.
- **Backup su R2 (opzione D)**: non ora.
- **Limiti noti**:
  - senza server, con l'app in background o a schermo bloccato, nessuna notifica locale può partire (JavaScript sospeso);
  - non è documentato se iOS mostri una notifica con l'app in primo piano: va provato sull'iPhone;
  - se il permesso viene rifiutato, bisogna reinstallare l'icona, e reinstallarla cancella i dati (fare prima un backup).

### A — Lampeggio (versione 1.0.6)

- `fb.flashScreen()` in `feedback.js`: un livello `.screen-flash` a tutto schermo, del colore di successo, che non intercetta i tocchi. È animato con le Web Animations, perché la regola CSS sul movimento ridotto azzera le animazioni CSS.
- **Impostazioni** (Timer): `timer.flash`, `timer.flashCount` (3), `timer.flashMs` (450), `timer.flashOpacity` (0,85). Tasto "Prova il lampeggio" in Informazioni.
- **Movimento ridotto**: un solo cambio di colore morbido, più tenue, della stessa durata totale.
- **Prova**: lampeggi e versione morbida misurati nel browser; lampeggio reale a fine recupero; nessun errore.

### B — Notifica locale (versione 1.0.6, insieme ad A)

- **`js/notify.js`**: stato del permesso, richiesta dal tocco, `registration.showNotification` con etichetta `gaia-gym-rest` e `renotify`, notifica di prova (subito o dopo `notify.testDelaySec`).
- **Fine recupero**:
  - testo "Recupero finito" con "{esercizio} · serie {n}" (esercizio successivo se quello corrente è finito, "Tutti gli esercizi completati" alla fine);
  - `RestTimer.onEnd(late)` ora passa il ritardo: oltre `notify.maxLateSec` (5 s) la notifica non parte, per esempio tornando nell'app a recupero già finito.
- **Doppio avviso**: `notify.replaceEndSound` toglie il bip finale dell'app quando parte la notifica. Preavviso e 3-2-1 restano.
- **Impostazioni**:
  - riquadro "Notifiche e vibrazione": stato, "Attiva le notifiche" (che accende anche `notify.local`), "Prova notifica e vibrazione", "Prova tra 10 secondi", istruzioni per le impostazioni dell'iPhone;
  - sezione "Notifiche di fine recupero" per le opzioni.
- **Service worker**: `notificationclick` porta in primo piano l'app aperta, altrimenti la apre su `#/workout`.
- **Prova nel browser**:
  - permesso concesso via CDP;
  - chiamate verificate: prova ("Prova di Gaia Gym"), fine recupero ("Recupero finito | Stacco rumeno · serie 2"), nessuna notifica con 250 s di ritardo simulato;
  - Chrome headless non visualizza le notifiche.
- **Da provare sull'iPhone**: se la notifica compare con l'app in primo piano e se vibra (suoneria, silenzioso, con musica). Dal risultato dipende il valore predefinito di "Notifica anche con l'app aperta" nella parte C.
