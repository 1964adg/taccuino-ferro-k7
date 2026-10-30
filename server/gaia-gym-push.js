// =====================================================================
//  Gaia Gym · server di notifica (Cloudflare Worker)
// =====================================================================
//  Da incollare così com'è nell'editor del Worker (pannello web di
//  Cloudflare). Istruzioni passo per passo: server/ISTRUZIONI.md
//
//  Cosa fa: quando inizia un recupero il telefono chiede "svegliami tra
//  N secondi". Il server mette un messaggio in coda (Cloudflare Queues)
//  con quel ritardo; alla scadenza manda una notifica push VUOTA al
//  telefono. Il testo lo compone il telefono stesso: al server arrivano
//  solo l'indirizzo push del telefono e il ritardo, nessun dato di
//  allenamento.
//
//  Collegamenti richiesti (Settings → Bindings):
//    DB    → database D1 (la tabella si crea da sola)
//    CODA  → coda Queues (produttore). Lo stesso Worker è anche il
//            consumatore della coda (dimensione del lotto 1, attesa 0).
//
//  Variabili (Settings → Variables and Secrets):
//    ORIGINE            testo   indirizzo del sito, es. https://utente.github.io
//                               (solo schema e dominio, senza la cartella)
//    SEGRETO            segreto la chiave segreta, uguale a quella nell'app
//    VAPID_PUBLIC_KEY   testo   chiave pubblica (da /genera-chiavi)
//    VAPID_PRIVATE_KEY  segreto chiave privata (da /genera-chiavi)
//    VAPID_SUBJECT      testo   facoltativa: contatto per i servizi push
//                               (https://... o mailto:...). Se manca, ORIGINE.
//
//  Solo Web Crypto, nessun pacchetto esterno.
// =====================================================================

const LIMITI = {
  richiesteAlMinuto: 60,     // per telefono
  telefoniMax: 10,           // telefoni registrabili in tutto
  ritardoMaxMs: 3600 * 1000, // sveglia più lontana accettata (1 ora)
  corpoMaxByte: 8192,
  ttlPushSec: 60,            // se la push non si consegna entro 60 s non serve più
  attesaFinaleMaxMs: 15000,  // il consumatore aspetta al massimo così l'istante esatto
  vapidValiditaSec: 12 * 3600,
  tentativiMax: 2,
};

// Servizi push accettati (Apple, Google, Mozilla, Microsoft)
const SERVIZI_PUSH = [
  /^web\.push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
];

// ---------------------------------------------------------------------
// Avvio
// ---------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/') return paginaStato(env);
      if (request.method === 'GET' && url.pathname === '/genera-chiavi') return paginaChiavi(env);
      if (request.method === 'OPTIONS') return risposta(request, env, null, 204);
      if (request.method === 'POST' && url.pathname.startsWith('/api/')) return await api(request, env, url.pathname.slice(5));
      return testo('Non trovato', 404);
    } catch (err) {
      console.log('Errore', err && err.stack || err);
      return risposta(request, env, { ok: false, errore: 'Errore interno del server' }, 500);
    }
  },

  // Consumatore della coda: alla scadenza manda la push
  async queue(batch, env, ctx) {
    await preparaTabella(env);
    await Promise.all(batch.messages.map((m) => consegna(m, env)));
  },
};

// ---------------------------------------------------------------------
// API usata dall'app
// Le richieste sono POST con corpo JSON in text/plain: così il browser non
// fa la richiesta preliminare (CORS), e la sveglia parte più in fretta.
// ---------------------------------------------------------------------

async function api(request, env, nome) {
  const conf = controllaConfigurazione(env);
  if (conf.length) return risposta(request, env, { ok: false, errore: 'Server non configurato: ' + conf.join(', ') }, 503);

  // Solo dal sito dell'app
  if (normalizzaOrigine(request.headers.get('Origin')) !== normalizzaOrigine(env.ORIGINE)) {
    return risposta(request, env, { ok: false, errore: 'Origine non consentita' }, 403);
  }
  const grezzo = await request.text();
  if (grezzo.length > LIMITI.corpoMaxByte) return risposta(request, env, { ok: false, errore: 'Richiesta troppo grande' }, 413);
  let dati;
  try { dati = JSON.parse(grezzo); } catch { return risposta(request, env, { ok: false, errore: 'Richiesta non valida' }, 400); }
  if (!dati || typeof dati !== 'object') return risposta(request, env, { ok: false, errore: 'Richiesta non valida' }, 400);
  if (!(await uguali(String(dati.segreto || ''), String(env.SEGRETO)))) {
    return risposta(request, env, { ok: false, errore: 'Chiave segreta errata' }, 401);
  }

  await preparaTabella(env);

  if (nome === 'chiave') return risposta(request, env, { ok: true, chiavePubblica: env.VAPID_PUBLIC_KEY });

  if (nome === 'sveglia' || nome === 'prova') {
    const iscr = iscrizioneValida(dati.iscrizione);
    if (!iscr) return risposta(request, env, { ok: false, errore: 'Iscrizione push non valida' }, 400);
    const traMs = Number(dati.traMs);
    if (!Number.isFinite(traMs) || traMs < 0 || traMs > LIMITI.ritardoMaxMs) return risposta(request, env, { ok: false, errore: 'Ritardo non valido' }, 400);
    const idSveglia = nome === 'prova' ? 'prova-' + casuale() : String(dati.idSveglia || '');
    if (!/^[\w-]{1,64}$/.test(idSveglia)) return risposta(request, env, { ok: false, errore: 'Identificativo non valido' }, 400);

    const id = await idTelefono(iscr.endpoint);
    const limite = await contaRichiesta(env, id, iscr);
    if (limite) return risposta(request, env, { ok: false, errore: limite }, 429);

    const scadenza = Date.now() + traMs;
    await env.DB.prepare('UPDATE telefoni SET sveglia = ?, scadenza = ? WHERE id = ?').bind(idSveglia, scadenza, id).run();
    // Il ritardo della coda si arrotonda per difetto: il consumatore aspetta il resto
    await env.CODA.send({ id, sveglia: idSveglia }, { delaySeconds: Math.floor(traMs / 1000) });
    return risposta(request, env, { ok: true, idSveglia });
  }

  if (nome === 'annulla') {
    const endpoint = typeof dati.endpoint === 'string' ? dati.endpoint : '';
    if (!endpoint) return risposta(request, env, { ok: false, errore: 'Indirizzo push mancante' }, 400);
    const id = await idTelefono(endpoint);
    await env.DB.prepare('UPDATE telefoni SET sveglia = NULL, scadenza = NULL WHERE id = ?').bind(id).run();
    return risposta(request, env, { ok: true });
  }

  if (nome === 'scollega') {
    const endpoint = typeof dati.endpoint === 'string' ? dati.endpoint : '';
    if (endpoint) await env.DB.prepare('DELETE FROM telefoni WHERE id = ?').bind(await idTelefono(endpoint)).run();
    return risposta(request, env, { ok: true });
  }

  return risposta(request, env, { ok: false, errore: 'Operazione sconosciuta' }, 404);
}

// ---------------------------------------------------------------------
// Consegna di una sveglia (dalla coda)
// ---------------------------------------------------------------------

async function consegna(msg, env) {
  try {
    const { id, sveglia } = msg.body || {};
    let riga = await leggiTelefono(env, id);
    // Annullata, spostata (±15 s crea una sveglia nuova) o telefono scollegato
    if (!riga || riga.sveglia !== sveglia) { msg.ack(); return; }

    // La coda lavora a secondi interi: si aspetta l'istante esatto
    const manca = riga.scadenza - Date.now();
    if (manca > 0) {
      await attendi(Math.min(manca, LIMITI.attesaFinaleMaxMs));
      riga = await leggiTelefono(env, id);
      if (!riga || riga.sveglia !== sveglia) { msg.ack(); return; }
    }

    const esito = await inviaPush(JSON.parse(riga.iscrizione).endpoint, env);
    if (esito === 404 || esito === 410) {
      // Iscrizione scaduta o revocata dal telefono: si dimentica
      await env.DB.prepare('DELETE FROM telefoni WHERE id = ?').bind(id).run();
    } else {
      await env.DB.prepare('UPDATE telefoni SET sveglia = NULL, scadenza = NULL WHERE id = ? AND sveglia = ?').bind(id, sveglia).run();
    }
    if (esito >= 500 && msg.attempts < LIMITI.tentativiMax) { msg.retry({ delaySeconds: 0 }); return; }
    msg.ack();
  } catch (err) {
    console.log('Consegna non riuscita', err && err.stack || err);
    if (msg.attempts < LIMITI.tentativiMax) msg.retry({ delaySeconds: 0 }); else msg.ack();
  }
}

/** Push senza contenuto, firmata con VAPID (RFC 8292). Restituisce lo stato HTTP. */
async function inviaPush(endpoint, env) {
  const jwt = await firmaVapid(new URL(endpoint).origin, env);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      TTL: String(LIMITI.ttlPushSec),
      Urgency: 'high',
      'Content-Length': '0',
    },
  });
  if (!res.ok) console.log('Servizio push ha risposto', res.status, await res.text().catch(() => ''));
  return res.status;
}

// ---------------------------------------------------------------------
// VAPID: JWT ES256 firmato con Web Crypto
// ---------------------------------------------------------------------

let chiavePrivataCache = null;

async function chiavePrivata(env) {
  const marca = env.VAPID_PRIVATE_KEY + env.VAPID_PUBLIC_KEY;
  if (chiavePrivataCache && chiavePrivataCache.marca === marca) return chiavePrivataCache.chiave;
  const pub = daBase64url(env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY non valida');
  const chiave = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', ext: true,
    d: env.VAPID_PRIVATE_KEY.trim(),
    x: aBase64url(pub.slice(1, 33)),
    y: aBase64url(pub.slice(33, 65)),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  chiavePrivataCache = { marca, chiave };
  return chiave;
}

async function firmaVapid(aud, env) {
  const enc = new TextEncoder();
  const testa = aBase64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = aBase64url(enc.encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + LIMITI.vapidValiditaSec,
    sub: (env.VAPID_SUBJECT || env.ORIGINE).trim(),
  })));
  const dati = enc.encode(testa + '.' + corpo);
  // Web Crypto restituisce già la firma nel formato r||s richiesto da ES256
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await chiavePrivata(env), dati);
  return testa + '.' + corpo + '.' + aBase64url(new Uint8Array(firma));
}

async function generaChiaviVapid() {
  const coppia = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', coppia.publicKey));
  const priv = await crypto.subtle.exportKey('jwk', coppia.privateKey);
  return { pubblica: aBase64url(pub), privata: priv.d };
}

// ---------------------------------------------------------------------
// Database (D1)
// ---------------------------------------------------------------------

let tabellaPronta = false;

async function preparaTabella(env) {
  if (tabellaPronta) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS telefoni (
    id TEXT PRIMARY KEY,
    iscrizione TEXT NOT NULL,
    sveglia TEXT,
    scadenza INTEGER,
    finestra INTEGER NOT NULL DEFAULT 0,
    conteggio INTEGER NOT NULL DEFAULT 0,
    aggiornato INTEGER NOT NULL DEFAULT 0
  )`).run();
  tabellaPronta = true;
}

const leggiTelefono = (env, id) => env.DB.prepare('SELECT * FROM telefoni WHERE id = ?').bind(id).first();

/** Registra il telefono (se nuovo) e applica il limite di richieste al minuto. Restituisce un errore o null. */
async function contaRichiesta(env, id, iscr) {
  const ora = Date.now();
  const minuto = Math.floor(ora / 60000);
  const riga = await leggiTelefono(env, id);
  if (!riga) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM telefoni').first();
    if (n >= LIMITI.telefoniMax) return 'Troppi telefoni registrati';
    await env.DB.prepare('INSERT INTO telefoni (id, iscrizione, finestra, conteggio, aggiornato) VALUES (?, ?, ?, 1, ?)')
      .bind(id, JSON.stringify(iscr), minuto, ora).run();
    return null;
  }
  const conteggio = riga.finestra === minuto ? riga.conteggio + 1 : 1;
  if (conteggio > LIMITI.richiesteAlMinuto) return 'Troppe richieste, riprova tra un minuto';
  await env.DB.prepare('UPDATE telefoni SET iscrizione = ?, finestra = ?, conteggio = ?, aggiornato = ? WHERE id = ?')
    .bind(JSON.stringify(iscr), minuto, conteggio, ora, id).run();
  return null;
}

// ---------------------------------------------------------------------
// Controlli
// ---------------------------------------------------------------------

function controllaConfigurazione(env) {
  const mancanti = [];
  if (!env.ORIGINE) mancanti.push('ORIGINE');
  if (!env.SEGRETO || String(env.SEGRETO).length < 16) mancanti.push('SEGRETO (almeno 16 caratteri)');
  if (!env.VAPID_PUBLIC_KEY) mancanti.push('VAPID_PUBLIC_KEY');
  if (!env.VAPID_PRIVATE_KEY) mancanti.push('VAPID_PRIVATE_KEY');
  if (!env.DB) mancanti.push('collegamento DB');
  if (!env.CODA) mancanti.push('collegamento CODA');
  return mancanti;
}

function iscrizioneValida(s) {
  if (!s || typeof s !== 'object' || typeof s.endpoint !== 'string' || s.endpoint.length > 2048) return null;
  let u;
  try { u = new URL(s.endpoint); } catch { return null; }
  if (u.protocol !== 'https:' || !SERVIZI_PUSH.some((re) => re.test(u.hostname))) return null;
  // Si conserva solo l'indirizzo: la push è vuota, le chiavi di cifratura non servono
  return { endpoint: s.endpoint };
}

/** Solo schema e dominio: va bene anche se in ORIGINE è incollato l'indirizzo completo dell'app. */
function normalizzaOrigine(o) {
  const s = String(o || '').trim();
  try { return new URL(s).origin.toLowerCase(); } catch { return s.toLowerCase(); }
}

/** Confronto a tempo costante (tramite hash), per non rivelare la chiave un carattere alla volta. */
async function uguali(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([a, b].map((x) => crypto.subtle.digest('SHA-256', enc.encode(x))));
  const va = new Uint8Array(ha); const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

async function idTelefono(endpoint) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------
// Pagine di servizio
// ---------------------------------------------------------------------

async function paginaStato(env) {
  const righe = [];
  const voce = (ok, txt) => righe.push(`<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${esc(txt)}</li>`);
  voce(!!env.ORIGINE, env.ORIGINE ? `ORIGINE: ${env.ORIGINE}` : 'ORIGINE mancante (indirizzo del sito, es. https://utente.github.io)');
  voce(!!env.SEGRETO && String(env.SEGRETO).length >= 16, env.SEGRETO ? (String(env.SEGRETO).length >= 16 ? 'SEGRETO impostato' : 'SEGRETO troppo corto (almeno 16 caratteri)') : 'SEGRETO mancante');
  let vapidOk = false;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    try { await firmaVapid('https://example.com', env); vapidOk = true; } catch { /* sotto */ }
  }
  voce(vapidOk, vapidOk ? 'Chiavi VAPID valide' : 'Chiavi VAPID mancanti o non valide: apri /genera-chiavi');
  let dbOk = false;
  if (env.DB) { try { await preparaTabella(env); dbOk = true; } catch { /* sotto */ } }
  voce(dbOk, dbOk ? 'Database DB collegato' : 'Collegamento DB mancante (database D1)');
  voce(!!env.CODA, env.CODA ? 'Coda CODA collegata (produttore)' : 'Collegamento CODA mancante (coda Queues)');
  const tutto = righe.every((r) => r.includes('class="ok"'));
  return html('Gaia Gym · server', `
    <h1>Gaia Gym · server di notifica</h1>
    <p>${tutto ? 'Configurazione completa. Ricorda di impostare questo Worker anche come <b>consumatore</b> della coda.' : 'Configurazione incompleta:'}</p>
    <ul>${righe.join('')}</ul>
    <p class="nota">Questa pagina non mostra mai la chiave segreta né la chiave privata.</p>`);
}

async function paginaChiavi(env) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return html('Chiavi già impostate', `<h1>Chiavi già impostate</h1>
      <p>Le chiavi VAPID sono già nelle variabili del Worker. Per cambiarle, cancella prima VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.</p>`);
  }
  const { pubblica, privata } = await generaChiaviVapid();
  const segreto = casuale() + casuale();
  return html('Nuove chiavi', `
    <h1>Nuove chiavi per Gaia Gym</h1>
    <p>Generate ora, solo per te: <b>non vengono salvate da nessuna parte</b>. Ricaricando la pagina ne escono di nuove.
    Copia ciascun valore nella variabile indicata (Settings → Variables and Secrets → Add).</p>
    <h2>VAPID_PUBLIC_KEY <small>(tipo Text)</small></h2><textarea readonly>${esc(pubblica)}</textarea>
    <h2>VAPID_PRIVATE_KEY <small>(tipo Secret)</small></h2><textarea readonly>${esc(privata)}</textarea>
    <h2>SEGRETO <small>(tipo Secret, proposta)</small></h2><textarea readonly>${esc(segreto)}</textarea>
    <p class="nota">La stessa chiave SEGRETO va inserita nell'app: Impostazioni → Notifiche a schermo spento → Chiave segreta.
    La chiave privata non va mai pubblicata né condivisa.</p>`);
}

// ---------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------

function risposta(request, env, corpo, stato = 200) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const origine = request.headers.get('Origin');
  if (origine && env.ORIGINE && normalizzaOrigine(origine) === normalizzaOrigine(env.ORIGINE)) {
    headers['Access-Control-Allow-Origin'] = origine;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
    headers.Vary = 'Origin';
  }
  return new Response(corpo === null ? null : JSON.stringify(corpo), { status: stato, headers });
}

function testo(t, stato = 200) {
  return new Response(t, { status: stato, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function html(titolo, corpo) {
  return new Response(`<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titolo)}</title><style>
body{font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:16px;line-height:1.5;color:#14161f;background:#f3f4f8}
h1{font-size:1.4rem}h2{font-size:1rem;margin:1.2rem 0 .3rem}small{color:#646a7b;font-weight:400}
li{list-style:none;margin:.3rem 0}.ok{color:#1d7f46}.no{color:#c0353a}ul{padding:0}
textarea{width:100%;box-sizing:border-box;font:14px ui-monospace,monospace;padding:8px;border-radius:8px;border:1px solid #ccc;height:4.5em}
.nota{font-size:.9rem;color:#646a7b}
</style></head><body>${corpo}</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function casuale() {
  return aBase64url(crypto.getRandomValues(new Uint8Array(12)));
}

function aBase64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function daBase64url(str) {
  const b = atob(String(str).trim().replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(str).trim().length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
