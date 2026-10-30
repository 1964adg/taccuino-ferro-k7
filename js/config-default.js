// Configurazione predefinita (preset) di Gaia Gym.
// Ogni valore qui è modificabile dall'utente in Impostazioni.
// Se un valore utente manca, è vuoto o non valido, si usa quello di questo file.

export const DEFAULTS = {
  app: {
    name: 'Gaia Gym',
    userName: '',
    locale: 'it-IT',
  },

  theme: {
    mode: 'auto',            // 'light' | 'dark' | 'auto'
    primary: '#6C5CE7',
    secondary: '#0EA5E9',
    success: '#22A55B',
    warning: '#F59E0B',
    danger: '#E5484D',
    onAccent: '#FFFFFF',     // testo sopra i colori pieni (tasti, avvisi)
    radius: 18,             // px
    spacing: 16,             // px, spaziatura base
    fontScale: 1,            // moltiplicatore della dimensione del testo
    tapMin: 52,              // px, altezza minima dei tasti
    light: {
      bg: '#F3F4F8',
      surface: '#FFFFFF',
      surface2: '#ECEEF4',
      text: '#14161F',
      muted: '#646A7B',
      border: '#E1E4EC',
    },
    dark: {
      bg: '#0D0E13',
      surface: '#181A22',
      surface2: '#232631',
      text: '#F2F3F7',
      muted: '#9AA0B1',
      border: '#2B2F3C',
    },
  },

  units: {
    weight: 'kg',            // 'kg' | 'lb' (i dati sono sempre salvati in kg)
    weightStep: 2.5,         // passo nell'unità scelta
    repsStep: 1,
    timeStep: 5,             // secondi
    distance: 'km',          // 'km' | 'mi' (i dati sono salvati in metri)
    distanceStep: 0.1,
    bodyweightStep: 0.1,
  },

  timer: {
    defaultRestSec: 90,
    autoStart: true,
    sound: true,
    soundVolume: 0.7,        // 0 – 1
    audioMode: 'ambient',    // 'ambient' (si mescola alla musica) | 'playback' (suona anche col silenzioso)
    haptics: false,          // trucco sperimentale iOS 18
    warnBeforeSec: 10,       // 0 = nessun preavviso
    adjustStepSec: 15,
    restAfterLastSet: true,
    autoAdvance: true,
    endBannerSec: 5,         // per quanto resta visibile l'avviso di fine recupero
    keepScreenOn: true,
  },

  workout: {
    defaultSets: 3,
    defaultRepsMin: 8,
    defaultRepsMax: 10,
    defaultWeightKg: 20,
    defaultDurationSec: 30,
    defaultDistanceM: 1000,
    defaultBodyweightKg: 60, // proposto la prima volta che registri il peso corporeo
    prefill: 'last',         // 'last' | 'max' | 'plan'
    rangePrefill: 'max',     // con un intervallo 8–10: 'min' propone 8, 'max' propone 10
    carryOver: true,         // la serie successiva riprende i valori appena fatti
    confirmMode: 'tap',      // 'tap' | 'hold' | 'confirm'
    holdMs: 600,
    showLastTime: true,
    showRecords: true,
    swipe: true,
    swipeThresholdPx: 60,
    repeatDelayMs: 400,      // tenendo premuto + o -, dopo quanto inizia la ripetizione
    repeatIntervalMs: 90,
  },

  dates: {
    format: 'ddd d mmm yyyy',     // formato generale
    shortFormat: 'd mmm',         // formato compatto (riquadri, elenchi)
    longFormat: 'dddd d mmmm',    // intestazione della Home
    monthLongFormat: 'mmmm yyyy', // titoli dei mesi nella cronologia
    weekLabelFormat: 'd/m',       // etichette delle settimane nei grafici
    monthLabelFormat: 'mmm',      // etichette dei mesi nei grafici
    chartDateFormat: 'd/m',       // date sull'asse dei grafici
    firstDayOfWeek: 1,       // 0 = domenica, 1 = lunedì
    weekdayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
    weekdayShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
    monthNames: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    monthShort: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  },

  training: {
    weekdays: [1, 3, 5],     // giorni abilitati (0 = domenica)
  },

  history: {
    sessionsShown: 20,                 // sessioni mostrate (cronologia e grafici)
    summaryPeriods: 8,                 // quante settimane o mesi nel grafico del riepilogo
    summaryKind: 'week',               // 'week' | 'month'
    summaryMetric: 'workouts',         // 'workouts' | 'volume'
    periodOptions: [30, 90, 180, 365, 0], // filtri di periodo in giorni (0 = tutto)
    defaultPeriodDays: 90,
    defaultMetric: 'e1rm',             // metrica iniziale nei grafici degli esercizi
  },

  charts: {
    height: 190,             // px
    gridLines: 4,
    dotRadius: 3.5,
    strokeWidth: 2.5,
  },

  stats: {
    e1rm: 'epley',           // 'epley' | 'brzycki'
    bodyweightInVolume: true,
    warmupInVolume: false,
  },

  backup: {
    reminderDays: 7,
    snoozeHours: 24,           // "Più tardi" nasconde il promemoria per queste ore
    filePrefix: 'gaia-gym-backup',
    csvPrefix: 'gaia-gym-cronologia',
    csvSeparator: ';',         // ";" è quello che Excel in italiano si aspetta
    csvDecimal: ',',
    autoBackupsKept: 3,        // copie automatiche conservate prima delle importazioni
    promptAfterWorkoutDays: 7, // proponi il backup su iCloud a fine allenamento ogni N giorni (0 = mai)
    periodicDays: 3,           // copia interna automatica ogni N giorni (0 = mai)
    periodicKept: 3,           // copie interne periodiche conservate
  },

  push: {
    enabled: false,
    serverUrl: '',
    secret: '',
  },

  // Testi dell'interfaccia. {n}, {name}, ecc. sono segnaposto.
  labels: {
    tabHome: 'Home',
    tabWorkout: 'Allenamento',
    tabPrograms: 'Schede',
    tabProgress: 'Progressi',
    tabSettings: 'Impostazioni',

    hello: 'Ciao',
    helloName: 'Ciao {name}',
    today: 'Oggi',
    scheduledToday: 'In programma oggi',
    nextInRotation: 'Prossimo in rotazione',
    restDayHint: 'Oggi non è un giorno di allenamento',
    chooseOtherDay: 'Scegli un altro giorno',
    startWorkout: 'Inizia allenamento',
    resumeWorkout: 'Riprendi allenamento',
    lastSession: 'Ultimo allenamento',
    noSessionsYet: 'Nessun allenamento ancora. Il primo è il più importante.',
    noActiveProgram: 'Nessuna scheda attiva. Creane una in Schede.',
    exercisesCount: '{n} esercizi',

    set: 'Serie',
    sets: 'Serie',
    reps: 'Ripetizioni',
    weight: 'Peso',
    addedWeight: 'Zavorra',
    rest: 'Recupero',
    time: 'Tempo',
    distance: 'Distanza',
    volume: 'Volume',
    duration: 'Durata',
    notes: 'Note',
    date: 'Data',
    bodyweight: 'Peso corporeo',
    warmup: 'Riscaldamento',
    warmupShort: 'R',

    done: 'Fatto',
    holdToConfirm: 'Tieni premuto',
    confirmSetQuestion: 'Registrare la serie?',
    prev: 'Precedente',
    next: 'Successivo',
    exit: 'Esci',
    finish: 'Termina',
    undoLast: 'Annulla ultima',
    setUndone: 'Serie annullata',
    restore: 'Ripristina',
    addSet: 'Serie extra',
    skipExercise: 'Salta esercizio',
    unskipExercise: 'Riprendi esercizio',
    skipped: 'Saltato',
    addExercise: 'Aggiungi esercizio',
    goToExercise: 'Vai all\'esercizio',
    newExercise: 'Nuovo esercizio',
    offPlan: 'Fuori scheda',
    exerciseName: 'Nome dell\'esercizio',
    measureType: 'Tipo di misurazione',
    lastTime: 'Ultima volta',
    firstTime: 'Prima volta',
    target: 'Obiettivo',
    newRecord: 'Nuovo record',
    allSetsDone: 'Esercizio completato',
    workoutComplete: 'Tutti gli esercizi completati',
    editSet: 'Modifica serie',
    deleteSet: 'Elimina serie',
    save: 'Salva',
    cancel: 'Annulla',
    close: 'Chiudi',
    confirm: 'Conferma',
    delete: 'Elimina',
    more: 'Altro',
    of: 'di',

    restRunning: 'Recupero',
    restOver: 'Recupero finito',
    skipRest: 'Salta',

    summaryTitle: 'Riepilogo',
    setsDone: 'Serie fatte',
    recordsBeaten: 'Record battuti',
    noRecords: 'Nessun record oggi',
    saveWorkout: 'Salva allenamento',
    continueWorkout: 'Continua',
    discardWorkout: 'Scarta allenamento',
    discardConfirm: 'Scartare l\'allenamento? Le serie fatte andranno perse.',
    workoutSaved: 'Allenamento salvato',
    workoutDiscarded: 'Allenamento scartato',
    noSetsDone: 'Non hai ancora registrato serie.',
    logBodyweight: 'Registra il peso corporeo',
    activeElsewhere: 'C\'è già un allenamento in corso.',
    noWorkoutActive: 'Nessun allenamento in corso.',
    goHome: 'Vai alla Home',

    measure_weight_reps: 'Peso e ripetizioni',
    measure_reps: 'Solo ripetizioni',
    measure_bodyweight_plus: 'Corpo libero + zavorra',
    measure_time: 'Tempo',
    measure_distance_time: 'Distanza e tempo',

    // Schede e programmazione
    newProgram: 'Nuova scheda',
    programName: 'Nome della scheda',
    programNotes: 'Note della scheda',
    newDay: 'Nuovo giorno',
    dayName: 'Nome del giorno',
    addDay: 'Aggiungi giorno',
    library: 'Libreria esercizi',
    libraryHint: 'Rinominare un esercizio aggiorna anche tutto lo storico.',
    importText: 'Importa da testo',
    activeBadge: 'Attiva',
    setActive: 'Rendi attiva',
    archivedSection: 'Archiviate',
    archivedDays: 'Giorni archiviati',
    archivedExercises: 'Esercizi archiviati',
    archive: 'Archivia',
    unarchive: 'Togli dall\'archivio',
    archivedLabel: 'Archiviato',
    duplicate: 'Duplica',
    rename: 'Rinomina',
    edit: 'Modifica',
    moveUp: 'Sposta su',
    moveDown: 'Sposta giù',
    dragHandle: 'Trascina per riordinare',
    copySuffix: ' (copia)',
    back: 'Indietro',
    deleteProgram: 'Elimina scheda',
    deleteProgramConfirm: 'Eliminare la scheda "{name}"? Lo storico degli allenamenti resta.',
    deleteDay: 'Elimina giorno',
    deleteDayConfirm: 'Eliminare il giorno "{name}" con i suoi esercizi?',
    removeFromDay: 'Rimuovi',
    itemRemoved: 'Esercizio tolto dal giorno',
    deleteExercise: 'Elimina esercizio',
    deleteExerciseConfirm: 'Eliminare "{name}" dalla libreria?',
    exerciseInUse: 'L\'esercizio è usato in {n} giorni di allenamento: toglilo prima da lì, oppure archivialo.',
    exerciseHasHistory: 'L\'esercizio ha uno storico: puoi archiviarlo ma non eliminarlo.',
    weekdaysLabel: 'Giorni della settimana',
    noPrograms: 'Nessuna scheda. Creane una o importala da testo.',
    noDays: 'Nessun giorno. Aggiungine uno.',
    noItems: 'Nessun esercizio in questo giorno.',
    noExercises: 'Nessun esercizio trovato.',
    muscleGroup: 'Gruppo muscolare',
    exerciseRest: 'Recupero dell\'esercizio',
    itemRest: 'Recupero in questa scheda',
    useDefaultRest: 'Usa il predefinito ({v})',
    repsMin: 'Ripetizioni (min)',
    repsMax: 'Ripetizioni (max)',
    warmupSets: 'Serie di riscaldamento',
    customizeSets: 'Personalizza le singole serie',
    customizeHint: 'Tocca un valore per cambiarlo solo in quella serie. Tieni premuto per tornare al valore comune.',
    changeExercise: 'Cambia esercizio',
    editExercise: 'Modifica esercizio',
    exerciseSettings: 'Impostazioni dell\'esercizio',
    search: 'Cerca',
    usedInDays: 'giorni che lo usano: {n}',
    unused: 'non usato',
    saved: 'Salvato',
    noGroup: 'Senza gruppo',
    planWeight: 'Peso previsto',
    noPlanWeight: 'nessuno',

    importTitle: 'Importa una scheda da testo',
    importHelp: 'Una riga per esercizio, con # per iniziare un giorno. I valori vanno dopo il nome.',
    importExample: 'Scheda: Il mio programma\n# Giorno A [lun, gio]\nPanca piana 4x8-10 60kg 90s 1 risc\nTrazioni 3x6 +5kg 2:00\nPlank 3x45s\nCrunch 3x20 cl\n# Giorno B [mer]\nSquat 5x5 80kg 3min // nota libera',
    importLegend: '4x8-10 = serie e ripetizioni · 60kg o 135lb = peso · +5kg = zavorra · 3x45s = serie a tempo · 1x2km = distanza · 90s, 2:00, 3min = recupero · 1 risc = serie di riscaldamento · cl = corpo libero · [lun, gio] = giorni · // = nota',
    importPreview: 'Anteprima',
    importCreate: 'Crea la scheda',
    importActivate: 'Rendila la scheda attiva',
    importWarnings: 'Da controllare',
    importNoName: 'Manca il nome dell\'esercizio',
    importIgnored: 'Parte non riconosciuta: "{text}"',
    importEmpty: 'Nessun esercizio riconosciuto.',
    importDone: 'Scheda importata. Esercizi nuovi in libreria: {n}',
    importDefaultDay: 'Giorno {n}',
    importDefaultName: 'Scheda importata',
    importNewTag: 'nuovo',
    importLine: 'riga {n}',
    useExample: 'Usa l\'esempio',

    // Progressi e cronologia
    progressSummary: 'Riepilogo',
    progressHistory: 'Cronologia',
    progressExercises: 'Esercizi',
    progressBody: 'Peso',
    week: 'Settimana',
    month: 'Mese',
    thisWeek: 'Questa settimana',
    thisMonth: 'Questo mese',
    workouts: 'Allenamenti',
    consistency: 'Costanza',
    consistencyDetail: '{done} giorni su {planned} previsti',
    totalVolume: 'Volume totale',
    totalTime: 'Tempo totale',
    trendTitle: 'Andamento',
    periodLabel: 'Periodo',
    periodDays: 'Ultimi {n} giorni',
    periodAll: 'Tutto',
    filterDay: 'Giorno',
    filterExercise: 'Esercizio',
    allDays: 'Tutti i giorni',
    allExercises: 'Tutti gli esercizi',
    noResults: 'Nessun allenamento con questi filtri.',
    showMore: 'Mostra altri',
    resultsCount: 'Allenamenti trovati: {n}',
    dateTime: 'Data e ora',
    durationMin: 'Durata (minuti)',
    deleteSession: 'Elimina allenamento',
    deleteSessionConfirm: 'Eliminare l\'allenamento del {date}? Non si può annullare.',
    sessionDeleted: 'Allenamento eliminato',
    removeExerciseConfirm: 'Togliere "{name}" da questo allenamento?',
    metric_e1rm: 'Massimale stimato',
    metric_maxWeight: 'Peso massimo',
    metric_volume: 'Volume',
    metric_maxReps: 'Ripetizioni massime',
    metric_totalReps: 'Ripetizioni totali',
    metric_maxDuration: 'Tempo massimo',
    metric_maxDistance: 'Distanza massima',
    records: 'Record personali',
    rec_maxWeight: 'Peso massimo',
    rec_e1rm: 'Massimale stimato (1RM)',
    rec_maxReps: 'Più ripetizioni',
    rec_bestVolume: 'Miglior volume in un allenamento',
    rec_maxDuration: 'Tempo più lungo',
    rec_maxDistance: 'Distanza più lunga',
    timesDone: 'Allenamenti: {n}',
    lastDone: 'Ultima volta: {date}',
    noHistoryExercises: 'Ancora nessun esercizio registrato.',
    onePoint: 'Il grafico si forma dal secondo allenamento.',
    noPointsInPeriod: 'Nessun dato nel periodo scelto.',
    sessionsOfExercise: 'Allenamenti con questo esercizio',
    bodyweightAdd: 'Registra il peso',
    bodyweightEntries: 'Registrazioni',
    noBodyweight: 'Nessun peso registrato. Puoi farlo qui o alla fine di un allenamento.',
    bodyweightChange: 'Variazione nel periodo',
    editEntry: 'Modifica registrazione',
    entryDeleted: 'Registrazione eliminata',
    perWorkout: 'per allenamento',

    // Backup, esportazione e importazione
    dataSection: 'Backup e dati',
    exportBackup: 'Esporta backup',
    exportBackupHint: 'Crea un file con tutti i dati. Su iPhone scegli "Salva su File" e poi iCloud Drive.',
    exportCsv: 'Esporta cronologia (CSV)',
    exportCsvHint: 'Una riga per serie, da aprire con Numbers o Excel.',
    importBackup: 'Importa backup',
    importBackupHint: 'Ripristina da un file di backup. Prima viene salvata una copia dello stato attuale.',
    lastExportAt: 'Ultimo backup: {date}',
    neverExported: 'Nessun backup esportato finora.',
    exportDone: 'Backup creato',
    exportCancelled: 'Esportazione annullata',
    csvDone: 'Cronologia esportata',
    importSummaryTitle: 'Contenuto del backup',
    importSummary: 'Schede: {programs} · Esercizi: {exercises} · Allenamenti: {sessions} · Pesate: {bodyweight}',
    importExportedAt: 'Creato il {date}',
    importMerge: 'Unisci',
    importMergeHint: 'Aggiunge i dati del file a quelli presenti. Se lo stesso elemento esiste in entrambi, vince la versione modificata più di recente. Le impostazioni di questo telefono restano.',
    importReplace: 'Sostituisci tutto',
    importReplaceHint: 'Cancella i dati attuali e usa solo quelli del file, impostazioni comprese.',
    importReplaceConfirm: 'Sostituire tutti i dati con quelli del file? Una copia dello stato attuale resta in "Copie automatiche".',
    importDoneMerge: 'Backup unito: {added} nuovi, {updated} aggiornati',
    importDoneReplace: 'Backup ripristinato',
    importErrNotJson: 'Il file non è leggibile: non è un file JSON valido.',
    importErrFormat: 'Questo file non è un backup di Gaia Gym.',
    importErrNewer: 'Il backup viene da una versione più recente dell\'app: aggiorna l\'app e riprova.',
    importErrStore: 'Il backup è danneggiato (sezione "{name}").',
    importErrRecord: 'Il backup contiene dati non validi (sezione "{name}").',
    importErrRead: 'Non è stato possibile leggere il file.',
    autoBackups: 'Copie automatiche',
    autoBackupsHint: 'Salvate da sole ogni pochi giorni e prima di ogni importazione o ripristino. Restano dentro l\'app su questo telefono: proteggono dagli errori, non dalla perdita dei dati dell\'app. Per quella serve il backup su iCloud Drive.',
    noAutoBackups: 'Nessuna copia automatica.',
    autoBackupItem: '{date} · {reason}',
    reason_merge: 'prima di un\'unione',
    reason_replace: 'prima di una sostituzione',
    reason_restore: 'prima di un ripristino',
    reason_periodic: 'copia periodica',
    afterWorkoutBackupTitle: 'Salva un backup',
    afterWorkoutBackupDays: 'Sono passati {n} giorni dall\'ultimo backup.',
    afterWorkoutBackupNever: 'Non hai ancora salvato un backup.',
    afterWorkoutBackupText: 'Un tocco su "Salva backup", poi "Salva su File" e scegli iCloud Drive.',
    saveBackupNow: 'Salva backup',
    notNow: 'Non ora',
    restoreAutoConfirm: 'Tornare allo stato del {date}? I dati attuali verranno sostituiti (e salvati a loro volta come copia).',
    restoreDone: 'Stato ripristinato',
    reminderTitle: 'È ora di un backup',
    reminderDays: 'Ultimo backup {n} giorni fa.',
    reminderNever: 'Non hai ancora esportato un backup.',
    reminderText: 'iOS può cancellare i dati dei siti poco usati: salva una copia su iCloud Drive.',
    reminderLater: 'Più tardi',
    reminderNow: 'Esporta ora',
    csvTime: 'Ora',

    // App, aggiornamenti, accessibilità
    aboutApp: 'Informazioni',
    appVersion: 'Versione {v}',
    offlineReady: 'Pronta per l\'uso offline.',
    offlineNotReady: 'Uso offline non attivo: serve la pubblicazione in HTTPS (es. GitHub Pages).',
    checkUpdates: 'Controlla aggiornamenti',
    updateAvailable: 'Nuova versione disponibile.',
    updateNow: 'Aggiorna',
    updateChecking: 'Scaricamento della nuova versione…',
    upToDate: 'L\'app è aggiornata.',
    updateUnavailable: 'Controllo non disponibile in questo momento.',
    navMain: 'Navigazione principale',
    editByHand: 'modifica a mano',
    increase: 'Aumenta',
    decrease: 'Diminuisci',
    skipToContent: 'Vai al contenuto',

    comingSoon: 'In arrivo in una prossima tappa.',
    progressBasic: 'Elenco base. Grafici, record e filtri arrivano nella tappa 3.',

    settingsDefault: 'Predefinito',
    resetOne: 'Ripristina predefinito',
    resetAll: 'Ripristina tutte le impostazioni',
    resetAllConfirm: 'Riportare tutte le impostazioni ai valori predefiniti? I dati di allenamento non vengono toccati.',
    resetDone: 'Impostazioni ripristinate',
    wipeData: 'Cancella tutti i dati',
    wipeConfirm1: 'Cancellare tutti i dati? Schede, allenamenti e impostazioni verranno eliminati.',
    wipeConfirm2: 'Ultima conferma: l\'operazione non si può annullare.',
    wipeDone: 'Dati cancellati',
    storagePersisted: 'Archiviazione protetta: iOS non dovrebbe cancellare i dati.',
    storageNotPersisted: 'Archiviazione non protetta: esporta spesso un backup.',
    yes: 'Sì',
    no: 'No',

    errStorageFull: 'Spazio di archiviazione esaurito. Esporta un backup e libera spazio.',
    errStorage: 'Errore nel salvataggio dei dati: {msg}',
    errNoIndexedDB: 'Questo browser non permette di salvare dati (IndexedDB non disponibile). Prova a uscire dalla navigazione privata.',
    errGeneric: 'Qualcosa è andato storto: {msg}',
  },

  // Scheda di esempio, generica, caricata al primo avvio.
  // Completamente modificabile ed eliminabile.
  sampleProgram: {
    name: 'Scheda di esempio · 3 giorni',
    notes: 'Programma generico gambe / spinte / tirate. Modificalo o eliminalo a piacere.',
    days: [
      {
        name: 'Giorno A · Gambe',
        weekdays: [1],
        items: [
          { exercise: 'Squat', group: 'Gambe', measure: 'weight_reps', sets: 4, repsMin: 6, repsMax: 8, weightKg: 40, restSec: 150 },
          { exercise: 'Leg press', group: 'Gambe', measure: 'weight_reps', sets: 3, repsMin: 10, repsMax: 12, weightKg: 80, restSec: 120 },
          { exercise: 'Leg curl', group: 'Femorali', measure: 'weight_reps', sets: 3, repsMin: 10, repsMax: 12, weightKg: 25 },
          { exercise: 'Calf raise', group: 'Polpacci', measure: 'weight_reps', sets: 3, repsMin: 12, repsMax: 15, weightKg: 30, restSec: 60 },
          { exercise: 'Plank', group: 'Core', measure: 'time', sets: 3, durationSec: 45, restSec: 60 },
        ],
      },
      {
        name: 'Giorno B · Spinte',
        weekdays: [3],
        items: [
          { exercise: 'Panca piana', group: 'Petto', measure: 'weight_reps', sets: 4, repsMin: 6, repsMax: 8, weightKg: 30, restSec: 150, warmupSets: 1 },
          { exercise: 'Lento avanti con manubri', group: 'Spalle', measure: 'weight_reps', sets: 3, repsMin: 8, repsMax: 10, weightKg: 10 },
          { exercise: 'Croci ai cavi', group: 'Petto', measure: 'weight_reps', sets: 3, repsMin: 12, repsMax: 12, weightKg: 10, restSec: 60 },
          { exercise: 'Push down ai cavi', group: 'Tricipiti', measure: 'weight_reps', sets: 3, repsMin: 10, repsMax: 12, weightKg: 15, restSec: 60 },
          { exercise: 'Dip', group: 'Tricipiti', measure: 'bodyweight_plus', sets: 3, repsMin: 6, repsMax: 10, weightKg: 0 },
        ],
      },
      {
        name: 'Giorno C · Tirate',
        weekdays: [5],
        items: [
          { exercise: 'Stacco rumeno', group: 'Femorali', measure: 'weight_reps', sets: 3, repsMin: 8, repsMax: 8, weightKg: 40, restSec: 150 },
          { exercise: 'Trazioni', group: 'Dorso', measure: 'bodyweight_plus', sets: 3, repsMin: 5, repsMax: 8, weightKg: 0, restSec: 120 },
          { exercise: 'Rematore con bilanciere', group: 'Dorso', measure: 'weight_reps', sets: 3, repsMin: 8, repsMax: 10, weightKg: 30 },
          { exercise: 'Lat machine', group: 'Dorso', measure: 'weight_reps', sets: 3, repsMin: 10, repsMax: 12, weightKg: 35 },
          { exercise: 'Curl con manubri', group: 'Bicipiti', measure: 'weight_reps', sets: 3, repsMin: 10, repsMax: 12, weightKg: 8, restSec: 60 },
        ],
      },
    ],
  },
};
