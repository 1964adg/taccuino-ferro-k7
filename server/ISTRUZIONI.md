# Server di notifica di Gaia Gym: istruzioni passo per passo

Con questo server il telefono riceve una **notifica (con vibrazione) a fine recupero anche a schermo bloccato** o mentre usi un'altra app. Si prepara **una volta sola**, dal sito di Cloudflare, **senza terminale e senza installare nulla**. Servono circa 20 minuti, meglio dal computer.

È **gratuito**: il piano Free di Cloudflare basta e avanza (circa 3.000 sveglie al giorno; ogni "+15 s" conta come una sveglia in più). Sul piano Free non viene mai addebitato nulla.

> **Nota sui nomi dei pulsanti.** Il pannello di Cloudflare cambia spesso aspetto. I nomi qui sotto sono quelli della documentazione di Cloudflare (ottobre 2026). Per le **code (Queues)** la documentazione descrive solo il terminale, quindi quei passaggi (punti 7 e 8) sono scritti in base al pannello come è di solito, e i nomi potrebbero essere un po' diversi. Se qualcosa non torna, annota cosa vedi sullo schermo e chiedi.

## Cosa ti serve alla fine

Tieni aperto un blocco note. Alla fine dovrai avere:

| Cosa | Dove va |
|---|---|
| Indirizzo del server (es. `https://gaia-gym-push.nome.workers.dev`) | nell'app |
| Chiave segreta | nel server **e** nell'app (la stessa) |
| Chiave pubblica e chiave privata VAPID | solo nel server |

---

## 1. Creare l'account

1. Apri **https://dash.cloudflare.com/sign-up**.
2. Inserisci email e password e tocca **Sign up**.
3. Apri l'email di Cloudflare e conferma l'indirizzo.
4. Se ti chiede di aggiungere un sito o un dominio, **salta**: non serve.

## 2. Creare il Worker (il server)

1. Nel menu a sinistra apri **Workers & Pages** (può stare sotto **Compute**).
2. Tocca **Create application** (oppure **Create**).
3. Scegli **Start with Hello World!** e poi **Get started**.
4. Come nome scrivi `gaia-gym-push` (o un altro nome a piacere, in minuscolo).
5. Tocca **Deploy**.
6. La prima volta Cloudflare può chiederti di scegliere un **sottodominio workers.dev**: scegline uno qualsiasi.
7. Alla fine compare l'indirizzo del server, simile a `https://gaia-gym-push.nome.workers.dev`. **Copialo nel blocco note.**

## 3. Incollare il codice

1. Apri il file [`gaia-gym-push.js`](gaia-gym-push.js) nel repository su GitHub, tocca **Raw** e copia **tutto** il testo (Ctrl+A, Ctrl+C).
2. Su Cloudflare, nella pagina del Worker, tocca **Edit code** (l'icona **`</>`** in alto a destra).
3. Nell'editor si apre `worker.js`: seleziona tutto e **cancellalo**.
4. Incolla il codice copiato.
5. Tocca **Deploy** (in alto a destra; in alcune versioni **Save and deploy**) e conferma.
6. Torna alla pagina del Worker con la freccia indietro o dal nome del Worker in alto.

## 4. Generare le chiavi

1. Apri nel browser l'indirizzo del server seguito da `/genera-chiavi`, per esempio:
   `https://gaia-gym-push.nome.workers.dev/genera-chiavi`
2. La pagina mostra tre valori: **VAPID_PUBLIC_KEY**, **VAPID_PRIVATE_KEY** e una proposta di **SEGRETO**. Sono generati sul momento e **non vengono salvati da nessuna parte**: se ricarichi la pagina ne escono di nuovi.
3. **Lascia aperta questa pagina** finché non hai finito il punto 5.

La chiave privata e la chiave segreta non vanno mai pubblicate, né su GitHub né altrove.

## 5. Impostare le variabili

1. Nella pagina del Worker apri **Settings**.
2. Nella sezione **Variables and Secrets** tocca **Add**.
3. Aggiungi queste quattro voci, una alla volta (con **Add variable** per aggiungere la successiva):

   | Type | Variable name | Value |
   |---|---|---|
   | Text | `ORIGINE` | l'indirizzo del tuo sito GitHub Pages, **solo** la prima parte: `https://tuonome.github.io` |
   | Text | `VAPID_PUBLIC_KEY` | il primo valore della pagina del punto 4 |
   | **Secret** | `VAPID_PRIVATE_KEY` | il secondo valore |
   | **Secret** | `SEGRETO` | il terzo valore (o una frase lunga a tua scelta, almeno 16 caratteri). **Copialo nel blocco note.** |

4. Tocca **Deploy** per salvare.

Facoltativa: `VAPID_SUBJECT` (Text), un contatto per i servizi push (`https://...` o `mailto:...`). Se manca si usa `ORIGINE`, e va bene così.

## 6. Creare il database e collegarlo

1. Nel menu a sinistra apri **Storage & databases** e poi **D1 SQL database**.
2. Tocca **Create Database**, scrivi il nome `gaia-gym` e tocca **Create**. Non serve creare tabelle: ci pensa il server.
3. Torna al Worker (**Workers & Pages** → `gaia-gym-push`) e apri la scheda **Bindings**.
4. Tocca **Add binding**, scegli **D1 database** e poi **Add binding**.
5. **Variable name**: `DB` (maiuscolo). **D1 database**: `gaia-gym`. Tocca **Add binding**.

## 7. Creare la coda e collegarla come "produttore"

La coda è la "sveglia": tiene in attesa ogni avviso fino alla fine del recupero.

1. Nel menu a sinistra apri **Storage & databases** e poi **Queues**.
2. Tocca **Create queue** (o **Create**), scrivi il nome `gaia-gym-sveglie` e conferma.
3. Torna al Worker → scheda **Bindings** → **Add binding** → scegli **Queue**.
4. **Variable name**: `CODA` (maiuscolo). **Queue**: `gaia-gym-sveglie`. Conferma con **Add binding**.

## 8. Collegare il Worker come "consumatore" della coda

È il collegamento che fa partire l'avviso alla scadenza.

1. Apri di nuovo **Storage & databases** → **Queues** → `gaia-gym-sveglie`.
2. Cerca la sezione dei consumatori (**Consumers**, o la scheda **Settings**) e tocca **Add consumer** (o **Connect**).
3. Tipo **Worker**; come Worker scegli `gaia-gym-push`.
4. Se compaiono le opzioni del lotto, imposta:
   - **Batch size** (dimensione del lotto): **1**;
   - **Max wait time** (attesa massima, `max_batch_timeout`): **0** secondi.

   Sono importanti: con i valori predefiniti (10 messaggi, 5 secondi) l'avviso può arrivare fino a 5 secondi in ritardo.
5. Conferma (**Add consumer** / **Save**).

## 9. Controllare che sia tutto a posto

Apri nel browser l'indirizzo del server **senza** niente dopo, per esempio `https://gaia-gym-push.nome.workers.dev`.

La pagina mostra una lista di controlli: devono essere **tutti verdi (✓)**. Se una voce è rossa (✗), dice cosa manca. Questa pagina non mostra mai le chiavi segrete.

Il consumatore della coda (punto 8) non si può verificare da questa pagina: lo verifica la prova del punto 11.

## 10. Collegare l'app

Sull'iPhone, nell'app aperta **dall'icona della Home**:

1. Se non l'hai già fatto: Impostazioni → riquadro **Notifiche e vibrazione** → **Attiva le notifiche** → **Consenti**.
2. Impostazioni → sezione **Notifiche a schermo spento (facoltativo)**:
   - **Usa il server di notifica**: attivo;
   - **Indirizzo del server**: quello del punto 2 (es. `https://gaia-gym-push.nome.workers.dev`);
   - **Chiave segreta**: la stessa messa in `SEGRETO`.
3. Torna su e apri il riquadro **Server di notifica (schermo bloccato)**. Deve dire **"Server raggiungibile, chiave segreta corretta."**
4. Tocca **Collega questo telefono**. Deve comparire **"Telefono collegato."**

## 11. Prova a schermo bloccato

1. Nel riquadro **Server di notifica** tocca **Prova dal server tra 10 secondi**.
2. **Blocca subito lo schermo** con il tasto laterale.
3. Entro una dozzina di secondi deve arrivare la notifica "Prova di Gaia Gym" e il telefono deve vibrare.

Poi una prova vera: inizia un allenamento, tocca **Fatto**, blocca lo schermo e aspetta la fine del recupero.

---

## Come funziona, in breve

- Al tocco di **Fatto** l'app manda al server l'indirizzo push del telefono e i secondi di recupero. Il server mette in coda una "sveglia" con quel ritardo.
- **+15 s** e **−15 s** creano una sveglia nuova, che sostituisce la precedente. **Salta** la annulla.
- Alla scadenza il server manda al telefono una notifica push **vuota**. Il testo ("Recupero finito · Panca piana · serie 3") lo compone il telefono stesso: **al server non arriva nessun dato di allenamento**.
- **Con l'app aperta** avvisa già il telefono (bip e notifica locale): negli ultimi 5 secondi l'app annulla la sveglia del server, per non avere un doppio avviso. Se blocchi lo schermo in quegli ultimi secondi, la sveglia viene rimandata.
- **Senza rete** (palestra in seminterrato) la notifica dal server non può arrivare. Il timer del telefono funziona comunque e l'app non mostra errori invasivi: l'esito dell'ultimo invio si vede nel riquadro "Server di notifica".

## Sicurezza

- Il server accetta richieste solo dal tuo sito (`ORIGINE`) e solo con la chiave segreta giusta.
- Accetta al massimo 10 telefoni e 60 richieste al minuto per telefono.
- Manda notifiche solo ai servizi push ufficiali (Apple, Google, Mozilla, Microsoft).
- Nel database restano solo l'indirizzo push del telefono, l'orario della prossima sveglia e un contatore.

## Se qualcosa non va

| Problema | Cosa fare |
|---|---|
| "Chiave segreta errata" | Nell'app la chiave deve essere identica a `SEGRETO`, senza spazi. |
| "Origine non consentita" | `ORIGINE` deve essere `https://tuonome.github.io` (va bene anche l'indirizzo completo dell'app). |
| "Server non configurato: …" | Manca la voce indicata: punto 5, 6 o 7. |
| Il server risponde ma la prova non arriva | Controlla il punto 8 (consumatore della coda). Su Cloudflare, nella pagina del Worker, la scheda **Logs** mostra gli errori. |
| La prova arriva ma non vibra | Impostazioni dell'iPhone → Notifiche → Gaia Gym, e Suoni e feedback aptico (vedi il riquadro "Notifiche e vibrazione" nell'app). |
| "Servizio push ha risposto 403" nei log | Le chiavi VAPID sono cambiate dopo il collegamento: riapri il riquadro "Server di notifica" nell'app e tocca di nuovo **Collega questo telefono**. |

## Aggiornare il codice del server

Quando nel repository cambia `server/gaia-gym-push.js`: Worker → **Edit code** → cancella tutto → incolla il nuovo codice → **Deploy**. Variabili, database e coda restano.
