# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

There is no build step, package manager, test suite, or linter. The app is static files served by XAMPP from `C:\xampp\htdocs\veloxconsig`.

- Open `http://localhost/veloxconsig/` in a browser (Apache must be running in the XAMPP control panel).
- To test a change: hard-reload the page (Ctrl+F5) — `app.js` is cached aggressively.
- Clipboard auto-paste (`colarTelegramAutomaticamente`) requires a secure context; it silently no-ops over plain `http://` on some browsers. `localhost` counts as secure in Chrome.

`index.php` contains no PHP — it is plain HTML with a `.php` extension. All dependencies (Bootstrap 5.3, Bootstrap Icons, SheetJS/`xlsx` 0.18.5) load from CDNs, so the app needs internet access to work.

Local assets are referenced relative to the document root of the app: `index.php` loads `assets/css/style.css` and `assets/js/app.js`, matching the on-disk layout. (These tags previously pointed at `css/`‑ and `js/`‑rooted paths that 404'd, leaving the served page with no stylesheet and no JavaScript.) There is no `.htaccess` and no rewrite rules — paths resolve exactly as written.

## Architecture

Single-page mobile CRM for a Brazilian payroll-loan (consignado) brokerage. One operator imports a spreadsheet of leads, works each card, and messages clients over WhatsApp. There is no backend and no server-side state — everything is in `assets/js/app.js` (~1200 lines, all globals, no modules).

### Login gate

`login.php` posts `{email, password}` to `AUTH_CONFIG.API_LOGIN` and stores the returned token. `index.php` calls `exigirAutenticacao()` in `<head>` (before any rendering) and redirects to the login page when there is no valid session. Removing those two `<script>` tags disables the gate entirely.

Credentials live in `AUTH_CONFIG` (`assets/js/auth.js`) — one place to edit. `montarCabecalhos()` in `login.js` always sends `x-api-key: <API_KEY>`, and adds `Authorization: Bearer <TOKEN_APP>` only when `TOKEN_APP` is non-empty and not the `YOUR_SECRET_TOKEN` placeholder — sending a placeholder would just earn a 401.

`x-api-key` is a custom header, so the browser makes this a preflighted request: the API must answer the `OPTIONS` probe with `Access-Control-Allow-Origin` for the serving origin and `Access-Control-Allow-Headers: x-api-key, content-type, authorization`. A missing preflight response surfaces as a `TypeError` from `fetch`, indistinguishable from an offline device — hence the error copy naming both causes. `curl` never reveals this, since CORS is enforced only by browsers.

Two things this is **not**: `API_KEY` is shipped to the browser and readable by anyone, so it is not a secret once deployed — keep it rotatable and scoped to the login endpoint, or move the call behind a backend proxy. And the redirect is a client-side convenience, not access control: `localStorage` is editable and the page is static. Treat both as UI, not security.

Session keys (`auth_token`, `auth_usuario`, `auth_expira`, `auth_email_lembrado`) are namespaced away from the per-CPF keys on purpose — `limparSessao()` must never wipe the operator's `status_` / `contato_` / `classificacao_` work. Sessions expire after `HORAS_SESSAO` (12h) unless the API returns `expires_in`; a token with no stored expiry is treated as expired.

The login response shape was never confirmed against the live API, so `extrairToken` / `extrairUsuario` / `extrairMensagem` in `assets/js/login.js` accept several common field spellings (`token`, `access_token`, `data.token`, Laravel-style `errors{}`). Once the real shape is known, collapse them to the actual path.

### Three screens, one page

`index.php` is a sidebar shell (`offcanvas-lg` — a drawer under 992px, a fixed column above) with sections toggled by `mostrarSecao()`:

- **Painel** — the original card workflow: import, dashboard tiles, search, WhatsApp, proposal modal. Local only.
- **Clientes** — a DataTables CRUD over `AUTH_CONFIG.API_CLIENTES`.
- **Importações** — spreadsheet upload + history over `AUTH_CONFIG.API_IMPORTACOES`.

Each table is built while hidden, so its section must call `columns.adjust().responsive.recalc()` on show or every column collapses to zero width. Both lists load lazily on first visit.

**The three data sets are distinct and only flow one way.** `clientes` (Painel) ← spreadsheet or `sincronizarPainel()`; `clientesApi` ← server; `importacoes` ← server. `sincronizarPainel()` is the only bridge: it rewrites `clientes` from `clientesApi`, re-reading `status_`/`data_`/`hora_` per CPF so the operator's history survives — that history has never existed server-side. It drops records without a CPF, since they have no local key. Nothing flows Painel → server except by uploading a spreadsheet.

### CRUD layer

`assets/js/api.js` is transport only: `requisitarApi()` attaches `x-api-key` plus `Authorization: Bearer <session token>` from `obterToken()`, and turns failures into an `ErroApi` carrying `.status` (0 = network/CORS, since `fetch` cannot distinguish offline from a blocked preflight). A 401 clears the session and bounces to the login page — the server rejecting the token is the one case the local expiry check cannot catch.

`assets/js/clientes-crud.js` holds the UI plus `mapearClienteDaApi` / `mapearClienteParaApi`. A client record looks like this:

```json
{"id":1,"key":"38d302de-…","cpf":"50181123878","nome":"…","celular":"11950824546",
 "email":"…","margemDisponivel":220.16,"margemBruta":1732.06,
 "createdAtUtc":"2026-07-25T01:03:00.394955Z","updatedAtUtc":"…"}
```

Three consequences worth knowing before touching this:

- **The phone field is `celular`, not `telefone`** — the spreadsheet side uses `telefone`, so the two models differ by one name.
- **There is no `status` on the server.** Status is local, `localStorage.status_<cpf>`, exactly as the Painel writes it. The table renders it read-only and re-reads it on every draw; it is never sent in a payload. `mapearClienteParaApi` emits exactly `{cpf, nome, celular, email}`.
- **`margemDisponivel` / `margemBruta` come from the bank queries**, not the operator, so they are display-only. They *are* echoed back on update — if `PUT` replaces the whole resource, omitting them would zero real margins.

The record shape is confirmed; the list *envelope* is not, so `extrairLista` still accepts `[…]`, `{data:[…]}`, `{clientes:[…]}` and paginated `{data:{data:[…]}}`.

**Two server identifiers, and `id` ≠ `id`.** The API sends both an integer `id` and a GUID `key`. Routes use the integer via `identificadorUrl()` — one line to switch to `key` if the backend disagrees. Locally, `cliente.id` means something else entirely: the CPF digits, because every localStorage key hangs off it. The server's PK is `idApi`. Never merge the two.

On save, the sent payload is the base and the API response overlays it — an API that replies with only `{id:1}` would otherwise blank out the row. If no id comes back at all, the list is reloaded so edit/delete keep a target.

Currency and dates sort wrong if `render` returns formatted text for every type: return the raw number/ISO string for `sort`/`filter` and format only for `display`.

### Uploads (`assets/js/importacoes.js`)

`POST /importacoes-clientes` takes `multipart/form-data` with the file under the field name `arquivo`. **Never set `Content-Type` for it.** The `curl` recipe spells the header out because curl computes the boundary itself; in the browser, setting it by hand produces a body with no boundary and the server rejects the upload. `requisitarApi` takes `opcoes.formulario` (a `FormData`) precisely so it can skip that header — `opcoes.corpo` is the JSON path.

A successful upload reloads both the import list and the client list, since the server creates clients as a side effect.

Only the POST contract is confirmed. Listing and delete are assumed to follow REST convention on the same path; `carregarImportacoes()` treats 404/405 as "this API has no listing" and says so instead of showing an error. The record mapper accepts several field spellings for the same reason — collapse it once the shape is known.

### Session lifetime

The API's JWT carries `exp` about an hour out. `expiracaoDoToken()` decodes that claim and it takes precedence over the login response's `expires_in` and over `HORAS_SESSAO`. Without it the local session outlives the token and every action 401s until the operator works out that they need to log in again. Non-JWT tokens fall through to the older rules.

DataTables `render` callbacks do no escaping of their own, so every one of them goes through `escaparHtml` / `escaparArgumento`.

### State model

Three module-level globals drive everything: `clientes` (the working array), `filtroAtual`, `pesquisaAtual`. `renderizarCards()` rebuilds `#clientes` from scratch on every change; `atualizarDashboard()` recounts the five dashboard tiles. Nearly every mutation ends by calling both.

Because cards are built as HTML strings with inline `onclick=` handlers, **every function invoked from a card or from `index.php` must be a top-level global**. Adding a bundler, `type="module"`, or an event-delegation refactor breaks all of them at once.

### Persistence: localStorage, keyed by CPF

The client `id` is the CPF stripped to digits (`somenteNumeros`), and it is the primary key for both the in-memory list and localStorage. Rows without a usable CPF are dropped at import. Keys written:

| Key | Written by | Meaning |
| --- | --- | --- |
| `status_<id>` | import, `alterarStatus` | `nao` \| `com` \| `sem` |
| `data_<id>`, `hora_<id>` | import, `alterarStatus` | when the status was set; cleared when status returns to `nao` |
| `contato_inicial_<id>` | `abrirWhatsapp` | `"sim"` once the first-contact message has been sent |
| `contato_data_<id>`, `contato_hora_<id>` | `abrirWhatsapp` | timestamp of first contact |
| `classificacao_<id>`, `classificacao_texto_<id>` | `gerarProposta` | outcome of the last Telegram parse |

Nothing ever reads these back except import and the "aguardando" counters — the app has no boot-time restore, so a page refresh empties the client list and the operator must re-import.

### Import merge precedence (`importarPlanilha`)

Import *replaces* `clientes` rather than appending. Per row, status resolves in this order — changing it silently rewrites operator work:

1. `Status` column in the spreadsheet, if it reads `COM` / `SEM` / `NÃO CONSULTADO` (and variants)
2. status of a matching CPF already in the in-memory list
3. `localStorage.status_<id>`
4. `"nao"`

`data`/`hora` follow the same cascade, then are forcibly blanked when the final status is `nao`. Column names are matched by a hardcoded alias list (`NOME`/`Nome`/`CLIENTE`, `CPF`, `TELEFONE`/`CELULAR`, `Status`, `Data`, `Hora`) — new spreadsheet headers must be added there.

CPFs lose leading zeros when Excel stores them as numbers. `copiarTexto` re-pads to 11 digits *on copy only*; the displayed and exported value stays as imported.

### Telegram proposal parser (`gerarProposta`)

The operator queries a Telegram bot for bank offers, pastes the raw reply into the modal, and this turns it into a client-ready WhatsApp message. Pipeline:

`normalizarRetornoTelegram` (unicode/dash/whitespace cleanup — every regex downstream assumes its output) → `ofertasPaypro` (offers under the "Paypro — ofertas disponíveis" block) → `resumoBancos` (fallback: the per-bank summary lines) → classification cascade.

The cascade order is deliberate, since a single reply can match several patterns:

1. **Offers found** → list every installment option, headline the largest `liberado`. Paypro wins when present; otherwise the bank with the highest released amount.
2. **Timeout** ("banco não respondeu a tempo", "tente novamente…") — checked *before* no-offer, because a retry is still worthwhile.
3. **Not eligible** (explicit text, or `Margem disponível: R$ 0,00`).
4. **No offer** ("nenhum banco disponível", "não aprovado pelo motor de crédito") — distinguishes margin > 0 (worth revisiting) from no margin.
5. Nothing matched → warn that the bot reply looks truncated.

The line regexes are tightly coupled to the bot's exact format (`1 — Banco — 84x R$ 123,45 → R$ 6.789,00`). If the bot's output changes, these are what break. `valorBR` converts pt-BR decimals (`1.234,56`) for comparison; all display strings stay pt-BR formatted.

### Escaping in card markup

Cards are assembled as HTML strings, so anything coming from the spreadsheet must go through a helper — names like `D'Ávila` or `Sant'Ana` are common and used to corrupt the markup:

- `escaparHtml(v)` for text content and plain attribute values.
- `escaparArgumento(v)` for a value landing inside a single-quoted JS string within an `onclick` (escapes for JS first, then for HTML). The browser decodes the entities when parsing the attribute, so the handler receives the original value.

`cliente.id` is exempt — it is `somenteNumeros(cpf)`, and rows without one are dropped at import, so it can only ever be digits.

### Shared predicates

`aguardandoResposta(cliente)` (status `nao` + `contato_inicial_<id>` set) backs the dashboard tile, the card badge, and `filtroAtual == "aguardando"` alike. Any new "which clients count as X" rule belongs in one function for the same reason — these three drifted apart before.

## Conventions

All identifiers, comments, and UI copy are Portuguese (pt-BR) — keep new code in the same language. Dates and times use `toLocaleDateString("pt-BR")` / `toLocaleTimeString("pt-BR")`. Phone numbers are stored formatted (`(11) 91234-5678`) and stripped plus prefixed with `55` only when opening `wa.me`.
