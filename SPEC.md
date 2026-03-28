# Ametyst Console

## Value Proposition
An in-assistant console for managing Ametyst services, credits, and spending inside ChatGPT / MCP Apps. Target: Ametyst operators and users who want to browse services, check balances, view transaction history, spend credits, and request access — without leaving the AI assistant.

**Core actions**: Browse services, check balance, view transactions, spend, request access.

## Why LLM?
**Conversational win**: "Spend on the NLP service using my wallet" = one sentence vs. navigating multiple dashboards.
**LLM adds**: Intent routing, contextual guidance, parameter resolution.
**What LLM lacks**: Live service catalog, wallet state, transaction history, spend/access APIs.

## UI Overview
**First view**: Inline card with an "Open Console" button.
**Fullscreen**: Tabbed console (Services | Balance | Transactions | Spend | Request Access).
**Services**: Auto-fetches list; user clicks a service to pre-fill Spend tab.
**Balance**: Input wallet/user IDs, fetch and display current balance.
**Transactions**: Same identifiers, displays transaction history.
**Spend**: Service selector + form fields (admin, user, virtual wallet, optional amount), confirm.
**Request Access**: Form (user, agent, optional amount, reason), submit.

## Product Context
- **Existing products**: Ametyst MCP backend
- **APIs**: `find-services`, `get-balance`, `get-transactions`, `spend`, `request-access` as MCP tools
- **Auth**: Sensitive values (API keys, wallet IDs) come from tool input or user form — never hardcoded
- **Constraints**: Widget is read-only for balance/services; spend and request-access have side effects

## UX Flows

Browse and spend:
1. Open console (switch to fullscreen)
2. Load services via `find-services` (auto on mount)
3. Click a service → navigate to Spend tab (pre-filled)
4. Fill remaining fields (adminId, userId, virtualWalletId, optional amount)
5. Confirm → call `spend` → show result and new balance

Check balance:
1. Open console → Balance tab
2. Enter walletId, userId (optional apiKey)
3. Fetch → display balance

View transactions:
1. Open console → Transactions tab
2. Enter walletId, userId (optional apiKey)
3. Fetch → display list

Request access:
1. Open console → Request Access tab
2. Fill userId, agentId (optional), amount (optional), reason
3. Submit → call `request-access` → show confirmation

## Tools and Widgets

**Widget: ametyst-console**
- **Input**: `{ prefillWalletId?: string, prefillUserId?: string }`
- **Output**: `{ opened: true, prefillWalletId?, prefillUserId? }`
- **Display**: inline card → user expands to fullscreen
- **Views**: Services, Balance, Transactions, Spend, Request Access tabs
- **Calls**: `find-services`, `get-balance`, `get-transactions`, `spend`, `request-access`

**Tool: find-services**
- **Input**: `{}` (no required params)
- **Output**: `{ services: Array<{ id, name, description, cost }> }`
- **Annotations**: readOnlyHint: true

**Tool: get-balance**
- **Input**: `{ walletId: string, userId: string, apiKey?: string }`
- **Output**: `{ balance: number, currency: string }`
- **Annotations**: readOnlyHint: true

**Tool: get-transactions**
- **Input**: `{ walletId: string, userId: string, apiKey?: string }`
- **Output**: `{ transactions: Array<{ id, date, amount, description, serviceId }> }`
- **Annotations**: readOnlyHint: true

**Tool: spend**
- **Input**: `{ serviceId: string, adminId: string, userId: string, virtualWalletId: string, amount?: number }`
- **Output**: `{ success: boolean, transactionId: string, newBalance: number }`
- **Annotations**: destructiveHint: true (spends credits)

**Tool: request-access**
- **Input**: `{ userId: string, agentId?: string, amount?: number, reason: string }`
- **Output**: `{ success: boolean, requestId: string }`
