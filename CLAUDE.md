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

### Known gaps

- `aplicarFiltro('aguardando')` highlights the tile but `renderizarCards()` has no matching branch, so the list is unfiltered.
- Client names are interpolated into HTML strings unescaped; a name containing `'` or `<` corrupts the card markup (only `abrirWhatsapp`'s argument is quote-escaped).

## Conventions

All identifiers, comments, and UI copy are Portuguese (pt-BR) — keep new code in the same language. Dates and times use `toLocaleDateString("pt-BR")` / `toLocaleTimeString("pt-BR")`. Phone numbers are stored formatted (`(11) 91234-5678`) and stripped plus prefixed with `55` only when opening `wa.me`.
