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
6. ⏳ Facoltativa: notifiche tramite Cloudflare Worker (Durable Object con sveglia), con il codice in `server/`.

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
