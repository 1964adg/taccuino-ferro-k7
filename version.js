// Versione dell'app. Va aumentata a OGNI pubblicazione: il service worker
// la usa per capire che c'è una versione nuova e aggiornare i file salvati sul telefono.
// È uno script classico (non un modulo) perché lo legge anche il service worker.
self.APP_VERSION = '1.0.3';
