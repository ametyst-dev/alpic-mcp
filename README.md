# Ametyst MCP

An MCP server built with [Skybridge](https://docs.skybridge.tech) that brings Ametyst's service marketplace directly into your AI assistant conversation.

Users can browse available services, check their credit balance, run services with a natural-language query, and request access — all without leaving the chat.

**Live app**: `https://alpic-mcp-b31bca29.alpic.live/mcp`

---

## What it does

The app exposes a single embedded widget (`ametyst-console`) that renders as a compact white card inside a ChatGPT or Claude conversation.

From the widget, users can:

1. **Browse services** — fetches the Ametyst service catalog (name, endpoint, cost)
2. **Check balance** — displays available credits and spending limit with a progress bar
3. **Run a service** — select a service, type a query, hit Run. The result is injected back into the conversation via `useSendFollowUpMessage` so the LLM can continue the workflow
4. **Request access** — submit a credit or access request without leaving the chat


---

## Architecture

```
server/src/index.ts          # MCP server — tools + widget registration
web/src/widgets/
  ametyst-console.tsx        # Main widget (inline card, no fullscreen)
web/src/helpers.ts           # generateHelpers<AppType>() — typed hooks
```

### Tools

| Tool | Description |
|---|---|
| `ametyst-console` | Widget — opens the embedded service console |
| `find-services` | Returns the full service catalog |
| `get-balance` | Returns balance + spending limit |
| `get-transactions` | Returns recent transaction history |
| `spend` | Executes a service and deducts credits |
| `request-access` | Submits an access or credit request |

### Widget flow (spend happy path)

1. `find-services({})` — auto-called on mount
2. User selects service → detail card + query field appear inline
3. User types query → hits **Run**
4. `spend({ serviceId, query })` — calls the merchant, returns result
5. `useSendFollowUpMessage` fires → LLM reads the tool output and surfaces the result in chat

---

## Local development

```bash
npm install
npm run dev
```

- Widget devtools: `http://localhost:3000/`
- MCP endpoint: `http://localhost:3000/mcp`

To test inside ChatGPT or Claude, expose the local server:

```bash
alpic tunnel --port 3000
```

Then add the tunnel URL as a connector in ChatGPT (`<tunnel-url>/mcp`) or Claude.

---

## Deploy

```bash
npm run build
npx alpic deploy --project-name alpic-mcp .
```

Connect the GitHub repo to Alpic for automatic deploys on every push:

```bash
npx alpic git connect --yes .
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `EXA_MERCHANT_URL` | `https://alpic-mor-production.up.railway.app` | Base URL for the EXA merchant |
| `EXA_SEARCH_PATH` | `/api/exa-search` | POST path for EXA search on the merchant |
| `EXA_USE_MOCK` | `0` | Set to `1` to always use mock data (skips HTTP) |
| `EXA_STRICT_MERCHANT` | `0` | Set to `1` to disable mock fallback |

---

## Built with

- [Skybridge](https://docs.skybridge.tech) — MCP server + widget framework
- [Alpic](https://alpic.ai) — hosting and deployment
- [Railway](https://railway.app) — EXA merchant backend
- React 19, TypeScript, Vite, Zod
