// Descrizione delle impostazioni mostrate nella schermata Impostazioni.
// "path" punta a una variabile di config-default.js. I testi sono descrittivi
// e restano qui perché documentano le impostazioni stesse.

const opt = (value, label) => ({ value, label });

export const SETTINGS_SCHEMA = [
  {
    id: 'general', title: 'Generale',
    items: [
      { path: 'app.name', type: 'text', label: 'Nome dell\'app', help: 'Mostrato nell\'intestazione e nel titolo. Il nome sotto l\'icona della Home si sceglie al momento dell\'installazione.' },
      { path: 'app.userName', type: 'text', label: 'Il tuo nome', help: 'Per il saluto nella Home e nella schermata di benvenuto. Lascia vuoto per non mostrarlo.' },
      { path: 'welcome.enabled', type: 'toggle', label: 'Schermata di benvenuto all\'apertura' },
      { path: 'welcome.durationMs', type: 'number', label: 'Durata della schermata di benvenuto (ms)', min: 500, max: 5000, step: 100, decimals: 0, help: 'Un tocco la chiude prima.' },
      { path: 'labels.welcomeSignature', type: 'text', label: 'Firma nella schermata di benvenuto' },
    ],
  },
  {
    id: 'look', title: 'Aspetto',
    items: [
      { path: 'theme.mode', type: 'segmented', label: 'Tema', options: [opt('light', 'Chiaro'), opt('dark', 'Scuro'), opt('auto', 'Automatico')], help: 'Automatico segue l\'impostazione del telefono.' },
      { path: 'theme.primary', type: 'color', label: 'Colore principale' },
      { path: 'theme.secondary', type: 'color', label: 'Colore secondario' },
      { path: 'theme.success', type: 'color', label: 'Colore di successo', help: 'Tasto "Fatto" e conferme.' },
      { path: 'theme.warning', type: 'color', label: 'Colore di avviso', help: 'Ultimi secondi del recupero.' },
      { path: 'theme.danger', type: 'color', label: 'Colore di pericolo' },
      { path: 'theme.splashFrom', type: 'color', label: 'Benvenuto: colore in alto' },
      { path: 'theme.splashTo', type: 'color', label: 'Benvenuto: colore in basso' },
      { path: 'theme.onAccent', type: 'color', label: 'Testo sui colori pieni', help: 'Colore del testo dentro i tasti colorati.' },
      { path: 'theme.fontScale', type: 'number', label: 'Dimensione del testo', min: 0.8, max: 1.6, step: 0.05, decimals: 2, help: '1 = normale.' },
      { path: 'theme.tapMin', type: 'number', label: 'Altezza minima dei tasti (px)', min: 44, max: 88, step: 2, decimals: 0 },
      { path: 'theme.radius', type: 'number', label: 'Raggio degli angoli (px)', min: 0, max: 32, step: 2, decimals: 0 },
      { path: 'theme.spacing', type: 'number', label: 'Spaziatura (px)', min: 8, max: 28, step: 2, decimals: 0 },
    ],
  },
  {
    id: 'palette', title: 'Colori di sfondo e testo',
    items: [
      ...['light', 'dark'].flatMap((mode) => {
        const name = mode === 'light' ? 'chiaro' : 'scuro';
        return [
          { path: `theme.${mode}.bg`, type: 'color', label: `Sfondo (tema ${name})` },
          { path: `theme.${mode}.surface`, type: 'color', label: `Riquadri (tema ${name})` },
          { path: `theme.${mode}.surface2`, type: 'color', label: `Riquadri secondari (tema ${name})` },
          { path: `theme.${mode}.text`, type: 'color', label: `Testo (tema ${name})` },
          { path: `theme.${mode}.muted`, type: 'color', label: `Testo attenuato (tema ${name})` },
          { path: `theme.${mode}.border`, type: 'color', label: `Bordi (tema ${name})` },
        ];
      }),
    ],
  },
  {
    id: 'units', title: 'Unità e passi',
    items: [
      { path: 'units.weight', type: 'segmented', label: 'Unità di peso', options: [opt('kg', 'kg'), opt('lb', 'lb')], help: 'I dati restano salvati in kg: cambiare unità non altera lo storico.' },
      { path: 'units.weightStep', type: 'number', label: 'Passo del peso', min: 0.05, max: 50, step: 0.25, decimals: 2, presets: [0.5, 1, 1.25, 1.5, 2, 2.5, 5], help: 'Quanto aumenta o diminuisce il peso a ogni tocco su + o −, nell\'unità scelta.' },
      { path: 'units.repsStep', type: 'number', label: 'Passo delle ripetizioni', min: 1, max: 10, step: 1, decimals: 0 },
      { path: 'units.timeStep', type: 'number', label: 'Passo del tempo (s)', min: 1, max: 60, step: 1, decimals: 0, presets: [1, 5, 10, 15, 30] },
      { path: 'units.distance', type: 'segmented', label: 'Unità di distanza', options: [opt('km', 'km'), opt('mi', 'mi')] },
      { path: 'units.distanceStep', type: 'number', label: 'Passo della distanza', min: 0.01, max: 10, step: 0.05, decimals: 2 },
      { path: 'units.bodyweightStep', type: 'number', label: 'Passo del peso corporeo', min: 0.05, max: 5, step: 0.05, decimals: 2 },
    ],
  },
  {
    id: 'workout', title: 'Allenamento',
    items: [
      { path: 'workout.prefill', type: 'select', label: 'Precompilazione del peso', options: [opt('last', 'Dall\'ultima sessione'), opt('max', 'Dal massimo'), opt('plan', 'Dal valore in scheda')], help: '"Dal massimo" usa il peso più alto mai fatto con almeno le ripetizioni previste.' },
      { path: 'workout.rangePrefill', type: 'segmented', label: 'Con un intervallo di ripetizioni (es. 8–10) proponi', options: [opt('min', 'Il minimo'), opt('max', 'Il massimo')] },
      { path: 'workout.carryOver', type: 'toggle', label: 'La serie successiva riprende i valori appena fatti', help: 'Se cambi il peso nella serie 1, la serie 2 parte già con quel peso.' },
      { path: 'workout.confirmMode', type: 'select', label: 'Tasto "Fatto"', options: [opt('tap', 'Un tocco registra la serie'), opt('hold', 'Tieni premuto per registrare'), opt('confirm', 'Tocco + conferma')] },
      { path: 'workout.holdMs', type: 'number', label: 'Durata della pressione (ms)', min: 200, max: 2000, step: 100, decimals: 0, help: 'Solo con "Tieni premuto".' },
      { path: 'exerciseIcons.show', type: 'toggle', label: 'Mostra le icone degli esercizi', help: 'Pittogrammi scelti in automatico; si cambiano (anche con una foto) in Schede → Libreria esercizi.' },
      { path: 'workout.showLastTime', type: 'toggle', label: 'Mostra i dati dell\'ultima volta' },
      { path: 'workout.showRecords', type: 'toggle', label: 'Mostra e segnala i record' },
      { path: 'workout.swipe', type: 'toggle', label: 'Scorri lateralmente per cambiare esercizio' },
      { path: 'workout.swipeThresholdPx', type: 'number', label: 'Sensibilità dello scorrimento (px)', min: 20, max: 200, step: 10, decimals: 0, help: 'Più è alto, più devi scorrere.' },
      { path: 'workout.repeatDelayMs', type: 'number', label: 'Tenendo premuto + o −, ripeti dopo (ms)', min: 150, max: 1500, step: 50, decimals: 0 },
      { path: 'workout.repeatIntervalMs', type: 'number', label: 'Velocità di ripetizione (ms)', min: 30, max: 500, step: 10, decimals: 0 },
    ],
  },
  {
    id: 'newExercise', title: 'Valori per un nuovo esercizio',
    items: [
      { path: 'workout.defaultSets', type: 'number', label: 'Serie', min: 1, max: 20, step: 1, decimals: 0 },
      { path: 'workout.defaultRepsMin', type: 'number', label: 'Ripetizioni (minimo)', min: 1, max: 100, step: 1, decimals: 0 },
      { path: 'workout.defaultRepsMax', type: 'number', label: 'Ripetizioni (massimo)', min: 1, max: 100, step: 1, decimals: 0 },
      { path: 'workout.defaultWeightKg', type: 'number', label: 'Peso proposto senza storico (kg)', min: 0, max: 500, step: 2.5, decimals: 2 },
      { path: 'workout.defaultDurationSec', type: 'number', label: 'Durata proposta (s)', min: 5, max: 3600, step: 5, decimals: 0 },
      { path: 'workout.defaultDistanceM', type: 'number', label: 'Distanza proposta (m)', min: 10, max: 50000, step: 100, decimals: 0 },
      { path: 'workout.defaultBodyweightKg', type: 'number', label: 'Peso corporeo iniziale proposto (kg)', min: 20, max: 300, step: 0.5, decimals: 1 },
    ],
  },
  {
    id: 'timer', title: 'Timer di recupero',
    items: [
      { path: 'timer.defaultRestSec', type: 'number', label: 'Recupero predefinito (s)', min: 0, max: 900, step: 15, decimals: 0, presets: [60, 90, 120, 180], help: 'Si può cambiare anche per singolo esercizio nella scheda.' },
      { path: 'timer.autoStart', type: 'toggle', label: 'Avvia il timer dopo "Fatto"' },
      { path: 'timer.restAfterLastSet', type: 'toggle', label: 'Recupero anche dopo l\'ultima serie dell\'esercizio' },
      { path: 'timer.autoAdvance', type: 'toggle', label: 'Passa da solo all\'esercizio successivo' },
      { path: 'timer.adjustStepSec', type: 'number', label: 'Secondi aggiunti o tolti con + e −', min: 5, max: 60, step: 5, decimals: 0 },
      { path: 'timer.warnBeforeSec', type: 'number', label: 'Preavviso prima della fine (s)', min: 0, max: 60, step: 1, decimals: 0, help: '0 = nessun preavviso.' },
      { path: 'timer.countdownFrom', type: 'number', label: 'Conto alla rovescia finale (s)', min: 0, max: 10, step: 1, decimals: 0, help: 'Un bip per ognuno degli ultimi secondi (3 = bip a 3, 2, 1). 0 = disattivato.' },
      { path: 'timer.endBannerSec', type: 'number', label: 'Durata dell\'avviso di fine (s)', min: 1, max: 30, step: 1, decimals: 0 },
      { path: 'timer.sound', type: 'toggle', label: 'Suono' },
      { path: 'timer.soundVolume', type: 'number', label: 'Volume del suono', min: 0.1, max: 1, step: 0.1, decimals: 1 },
      { path: 'timer.audioMode', type: 'select', label: 'Modalità audio', options: [opt('ambient', 'Si mescola alla musica (rispetta il silenzioso)'), opt('playback', 'Suona anche col silenzioso (può interrompere la musica)')], help: 'Con "si mescola" il bip si sente sopra la musica ma è muto se il telefono è in silenzioso. Puoi verificarlo con "Prova il suono" in fondo alle Impostazioni.' },
      { path: 'timer.flash', type: 'toggle', label: 'Lampeggio dello schermo a fine recupero', help: 'Tutto lo schermo lampeggia del colore di successo: si vede anche con la coda dell\'occhio. Se sul telefono è attivo "Riduci movimento", diventa un solo cambio di colore morbido.' },
      { path: 'timer.flashCount', type: 'number', label: 'Numero di lampeggi', min: 1, max: 10, step: 1, decimals: 0 },
      { path: 'timer.flashMs', type: 'number', label: 'Durata di ogni lampeggio (ms)', min: 150, max: 2000, step: 50, decimals: 0 },
      { path: 'timer.flashOpacity', type: 'number', label: 'Intensità del lampeggio', min: 0.2, max: 1, step: 0.05, decimals: 2, help: '1 = colore pieno.' },
      { path: 'timer.keepScreenOn', type: 'toggle', label: 'Schermo sempre acceso durante l\'allenamento', help: 'Consigliato: con lo schermo spento iOS sospende l\'app e il timer non può suonare.' },
    ],
  },
  {
    id: 'calendar', title: 'Calendario e date',
    items: [
      { path: 'training.weekdays', type: 'weekdays', label: 'Giorni di allenamento', help: 'Negli altri giorni la Home segnala il riposo (puoi comunque allenarti).' },
      { path: 'dates.firstDayOfWeek', type: 'segmented', label: 'Primo giorno della settimana', options: [opt(1, 'Lunedì'), opt(0, 'Domenica')] },
      { path: 'dates.format', type: 'text', label: 'Formato data', presets: ['ddd d mmm yyyy', 'dd/mm/yyyy', 'd mmmm yyyy', 'yyyy-mm-dd'], help: 'Segnaposto: d, dd, ddd, dddd, m, mm, mmm, mmmm, yy, yyyy.' },
      { path: 'dates.shortFormat', type: 'text', label: 'Formato data compatto', presets: ['d mmm', 'dd/mm', 'ddd d'] },
      { path: 'dates.longFormat', type: 'text', label: 'Formato data nella Home', presets: ['dddd d mmmm', 'ddd d mmm', 'dd/mm/yyyy'] },
    ],
  },
  {
    id: 'stats', title: 'Statistiche e cronologia',
    items: [
      { path: 'history.sessionsShown', type: 'number', label: 'Sessioni mostrate in grafici e cronologia', min: 5, max: 500, step: 5, decimals: 0, help: 'Nella cronologia, "Mostra altri" ne carica altrettante.' },
      { path: 'history.defaultPeriodDays', type: 'select', label: 'Periodo iniziale dei filtri', options: [opt(30, 'Ultimi 30 giorni'), opt(90, 'Ultimi 90 giorni'), opt(180, 'Ultimi 180 giorni'), opt(365, 'Ultimo anno'), opt(0, 'Tutto')] },
      { path: 'history.summaryKind', type: 'segmented', label: 'Riepilogo per', options: [opt('week', 'Settimana'), opt('month', 'Mese')] },
      { path: 'history.summaryPeriods', type: 'number', label: 'Periodi nel grafico del riepilogo', min: 4, max: 24, step: 1, decimals: 0 },
      { path: 'history.summaryMetric', type: 'segmented', label: 'Il grafico del riepilogo mostra', options: [opt('workouts', 'Allenamenti'), opt('volume', 'Volume')] },
      { path: 'history.defaultMetric', type: 'select', label: 'Metrica iniziale dei grafici esercizio', options: [opt('e1rm', 'Massimale stimato'), opt('maxWeight', 'Peso massimo'), opt('volume', 'Volume'), opt('maxReps', 'Ripetizioni massime')] },
      { path: 'charts.height', type: 'number', label: 'Altezza dei grafici (px)', min: 120, max: 400, step: 10, decimals: 0 },
      { path: 'charts.gridLines', type: 'number', label: 'Linee della griglia', min: 2, max: 8, step: 1, decimals: 0 },
      { path: 'charts.strokeWidth', type: 'number', label: 'Spessore della linea', min: 1, max: 6, step: 0.5, decimals: 1 },
      { path: 'charts.dotRadius', type: 'number', label: 'Dimensione dei punti', min: 0, max: 8, step: 0.5, decimals: 1 },
      { path: 'stats.e1rm', type: 'segmented', label: 'Formula del massimale stimato', options: [opt('epley', 'Epley'), opt('brzycki', 'Brzycki')] },
      { path: 'stats.bodyweightInVolume', type: 'toggle', label: 'Includi il peso corporeo nel volume', help: 'Per gli esercizi a corpo libero, se hai registrato il peso corporeo.' },
      { path: 'stats.warmupInVolume', type: 'toggle', label: 'Conta il riscaldamento nel volume' },
    ],
  },
  {
    id: 'backup', title: 'Backup',
    items: [
      { path: 'backup.reminderDays', type: 'number', label: 'Promemoria di backup dopo (giorni)', min: 1, max: 90, step: 1, decimals: 0 },
      { path: 'backup.snoozeHours', type: 'number', label: '"Più tardi" nasconde il promemoria per (ore)', min: 1, max: 168, step: 1, decimals: 0 },
      { path: 'backup.filePrefix', type: 'text', label: 'Nome del file di backup', help: 'A questo si aggiungono data e ora.' },
      { path: 'backup.csvPrefix', type: 'text', label: 'Nome del file CSV' },
      { path: 'backup.csvSeparator', type: 'segmented', label: 'Separatore delle colonne CSV', options: [opt(';', 'Punto e virgola'), opt(',', 'Virgola'), opt('\t', 'Tabulazione')] },
      { path: 'backup.csvDecimal', type: 'segmented', label: 'Separatore decimale CSV', options: [opt(',', 'Virgola'), opt('.', 'Punto')] },
      { path: 'backup.promptAfterWorkoutDays', type: 'number', label: 'Proponi il backup a fine allenamento ogni (giorni)', min: 0, max: 60, step: 1, decimals: 0, help: '0 = mai. A fine allenamento compare "Salva backup": un tocco e lo salvi su iCloud Drive.' },
      { path: 'backup.periodicDays', type: 'number', label: 'Copia interna automatica ogni (giorni)', min: 0, max: 30, step: 1, decimals: 0, help: '0 = mai. Avviene da sola, senza tocchi, dentro l\'app.' },
      { path: 'backup.periodicKept', type: 'number', label: 'Copie interne periodiche conservate', min: 1, max: 10, step: 1, decimals: 0 },
      { path: 'backup.autoBackupsKept', type: 'number', label: 'Copie conservate prima delle importazioni', min: 1, max: 10, step: 1, decimals: 0 },
    ],
  },
  {
    id: 'notify', title: 'Notifiche di fine recupero',
    items: [
      { path: 'notify.local', type: 'toggle', label: 'Notifica a fine recupero (app aperta)', help: 'Serve il permesso: si attiva con "Attiva le notifiche" nel riquadro "Notifiche e vibrazione". Senza server funziona solo con l\'app aperta.' },
      { path: 'notify.replaceEndSound', type: 'toggle', label: 'Con la notifica, niente bip finale dell\'app', help: 'Evita il doppio avviso: suona e vibra solo la notifica. Il preavviso e il 3-2-1 restano.' },
      { path: 'notify.maxLateSec', type: 'number', label: 'Nessuna notifica se in ritardo di oltre (s)', min: 1, max: 60, step: 1, decimals: 0, help: 'Se torni nell\'app dopo la fine del recupero, la notifica non serve più.' },
      { path: 'notify.testDelaySec', type: 'number', label: 'Ritardo della notifica di prova (s)', min: 3, max: 60, step: 1, decimals: 0 },
    ],
  },
  {
    id: 'push', title: 'Notifiche a schermo spento (facoltativo)',
    items: [
      { path: 'push.enabled', type: 'toggle', label: 'Usa il server di notifica', help: 'Serve un server Cloudflare tuo: a cosa serve e come prepararlo nel riquadro "Server di notifica" (tasto ? e "Apri le istruzioni complete"). Al server arrivano solo l\'indirizzo push del telefono e la durata del recupero.' },
      { path: 'push.serverUrl', type: 'text', label: 'Indirizzo del server', help: 'Es. https://gaia-gym-push.nome.workers.dev' },
      { path: 'push.secret', type: 'text', label: 'Chiave segreta', help: 'La stessa messa nella variabile SEGRETO del server.' },
      { path: 'push.cancelBeforeEndSec', type: 'number', label: 'Con l\'app aperta, annulla la push negli ultimi (s)', min: 0, max: 30, step: 1, decimals: 0, help: 'Se l\'app è in primo piano e la notifica locale è attiva, a fine recupero avvisa già il telefono: la push del server (che arriva 1–3 s dopo) si annulla per non avere un doppio avviso. 0 = mai.' },
      { path: 'push.timeoutMs', type: 'number', label: 'Attesa massima del server (ms)', min: 1000, max: 20000, step: 500, decimals: 0 },
      { path: 'push.testDelaySec', type: 'number', label: 'Ritardo della prova dal server (s)', min: 3, max: 120, step: 1, decimals: 0 },
    ],
  },
];
