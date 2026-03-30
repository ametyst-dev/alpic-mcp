import { McpServer } from "skybridge/server";
import { z } from "zod";

const BASE_URL = "https://alpic-web-app-git-main-ametyst.vercel.app";


const server = new McpServer(
  {
    name: "ametyst-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {},
    instructions:
      "IMPORTANT RULE: Whenever the user mentions 'ametyst' or any Ametyst-related topic (services, credits, balance, wallet, access), you MUST call the 'ametyst-console' tool FIRST and IMMEDIATELY — before calling any other tool or generating any response. Do not call find-services, get-balance, get-transactions, check-wallet, spend, or request-access without first opening the console via 'ametyst-console'.",
  },
)
  .registerWidget(
    "ametyst-console",
    {
      description: "Ametyst Console",
      _meta: {
        ui: {
          domain: "bcc3ca90ac7694442d9c24f94386c60d.claudemcpcontent.com",
          csp: {
            connectDomains: ["https://api.ametyst.ai", BASE_URL],
          },
        },
      },
    },
    {
      description:
        "ALWAYS call this tool first whenever the user mentions 'ametyst' or any Ametyst-related topic. Open the Ametyst service console before calling any other Ametyst tool (find-services, get-balance, spend, request-access, etc.). The console lets users browse services, check balance, view transactions, spend credits, and request access.",
      inputSchema: {
        prefillApiKey: z
          .string()
          .optional()
          .describe("Pre-fill the API key for the user's session."),
      },
    },
    async ({ prefillApiKey }) => {
      return {
        structuredContent: {
          opened: true,
          prefillApiKey: prefillApiKey ?? null,
        },
        content: [{ type: "text", text: "Ametyst Console opened." }],
      };
    },
  )
  .registerTool(
    "find-services",
    {
      description: "Find all available Ametyst services with name, description, and endpoint.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      const res = await fetch(`${BASE_URL}/api/services`);
      if (!res.ok) {
        return {
          structuredContent: { services: [] },
          content: [{ type: "text", text: `Failed to fetch services: HTTP ${res.status}` }],
          isError: true,
        };
      }
      const data = await res.json() as Array<{
        id: string;
        name: string;
        description: string;
        endpoint_url: string;
        cost: number;
        input_schema: Record<string, unknown>;
        output_schema: Record<string, unknown>;
      }>;
      const services = data.map((svc) => ({
        id: svc.id,
        name: svc.name,
        description: svc.description,
        endpoint: svc.endpoint_url,
        cost: svc.cost,
        inputSchema: svc.input_schema as { type: string; required?: string[]; properties?: Record<string, { type: string; description?: string }> } | undefined,
        outputSchema: svc.output_schema,
      }));
      return {
        structuredContent: { services },
        content: [{ type: "text", text: `Found ${services.length} service(s).` }],
      };
    },
  )
  .registerTool(
    "get-balance",
    {
      description: "Get the credit balance and spending limit for the authenticated account.",
      inputSchema: {
        apiKey: z.string().optional().describe("API key for authentication."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ apiKey }) => {
      void apiKey;
      return {
        content: [{ type: "text", text: "Balance endpoint not yet connected." }],
      };
    },
  )
  .registerTool(
    "get-transactions",
    {
      description: "Get recent transaction history for the authenticated account.",
      inputSchema: {
        apiKey: z.string().optional().describe("API key for authentication."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ apiKey }) => {
      void apiKey;
      return {
        structuredContent: { transactions: [] },
        content: [{ type: "text", text: "Transaction history not yet connected." }],
      };
    },
  )
  .registerTool(
    "check-wallet",
    {
      description: "Check the status of a wallet request (pending / approved / rejected).",
      inputSchema: {
        walletId: z.string().describe("The wallet ID returned by request-access."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ walletId }) => {
      const res = await fetch(
        `${BASE_URL}/api/wallets/check?wallet_id=${encodeURIComponent(walletId)}`,
      );
      if (!res.ok) {
        return {
          structuredContent: { walletId, status: "error", spent: 0 },
          content: [{ type: "text", text: `Failed to check wallet: HTTP ${res.status}` }],
          isError: true,
        };
      }
      const data = await res.json() as { id: string; status: string; spent: number; spending_limit: number };
      return {
        structuredContent: { walletId: data.id, status: data.status, spent: data.spent, spendingLimit: data.spending_limit },
        content: [{ type: "text", text: `Wallet ${data.id}: ${data.status} (spent: ${data.spent}/${data.spending_limit})` }],
      };
    },
  )
  .registerTool(
    "spend",
    {
      description: "Execute a payment from an approved wallet to use an Ametyst service.",
      inputSchema: {
        apiKey: z.string().optional().describe("API key for authentication."),
        walletId: z.string().optional().describe("The approved wallet ID to spend from."),
        amount: z.number().describe("Amount to spend."),
        endpointUrl: z.string().optional().describe("The service endpoint URL to call after payment."),
        params: z.record(z.string(), z.unknown()).optional().describe("Input params to forward to the service endpoint, matching its input_schema."),
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ apiKey, walletId, amount, endpointUrl, params }) => {
      if (!apiKey || !walletId) {
        return {
          structuredContent: { success: false, error: "API key and wallet ID are required" },
          content: [{ type: "text", text: "Spend failed: set your API key and request a wallet first." }],
          isError: true,
        };
      }
      const walletCheck = await fetch(
        `${BASE_URL}/api/wallets/check?wallet_id=${encodeURIComponent(walletId)}`,
      );
      if (!walletCheck.ok) {
        return {
          structuredContent: { success: false, error: `Failed to verify wallet: HTTP ${walletCheck.status}` },
          content: [{ type: "text", text: `Spend blocked: could not verify wallet status.` }],
          isError: true,
        };
      }
      const walletData = await walletCheck.json() as { id: string; status: string; spent: number };
      if (walletData.status !== "approved") {
        return {
          structuredContent: { success: false, error: `Wallet not approved (current status: ${walletData.status})` },
          content: [{ type: "text", text: `Spend blocked: wallet status is "${walletData.status}". Wait for admin approval, then retry.` }],
          isError: true,
        };
      }
      const res = await fetch(`${BASE_URL}/api/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, wallet_id: walletId, amount }),
      });
      if (res.status === 401) {
        return {
          structuredContent: { success: false, error: "Invalid API key" },
          content: [{ type: "text", text: "Spend failed: invalid API key." }],
          isError: true,
        };
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}) as Record<string, string>);
        const msg = (err as { error?: string }).error ?? `HTTP ${res.status}`;
        return {
          structuredContent: { success: false, error: msg },
          content: [{ type: "text", text: `Spend failed: ${msg}` }],
          isError: true,
        };
      }
      const data = await res.json() as { remaining: number; admin_balance: number };

      // Payment succeeded — now call the service endpoint if provided
      if (endpointUrl && params) {
        const svcRes = await fetch(endpointUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const svcData = await svcRes.json().catch(() => null) as Record<string, unknown> | null;
        return {
          structuredContent: {
            success: true,
            remaining: data.remaining,
            adminBalance: data.admin_balance,
            output: svcData,
          },
          content: [{ type: "text", text: `Payment successful (remaining: ${data.remaining}). Service response: ${JSON.stringify(svcData)}` }],
        };
      }

      return {
        structuredContent: { success: true, remaining: data.remaining, adminBalance: data.admin_balance, output: null },
        content: [{ type: "text", text: `Payment successful. Remaining balance: ${data.remaining}` }],
      };
    },
  )
  .registerTool(
    "request-access",
    {
      description: "Request a wallet with a spending limit for Ametyst services. After approval, use the wallet ID with the spend tool.",
      inputSchema: {
        apiKey: z.string().optional().describe("API key for authentication."),
        spendingLimit: z.number().describe("Requested spending limit in credits."),
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    },
    async ({ apiKey, spendingLimit }) => {
      if (!apiKey) {
        return {
          structuredContent: { success: false, error: "API key required", walletId: null as string | null, status: null as string | null },
          content: [{ type: "text", text: "Access request failed: API key required." }],
          isError: true,
        };
      }
      const res = await fetch(`${BASE_URL}/api/wallets/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, spending_limit: spendingLimit }),
      });
      if (res.status === 401) {
        return {
          structuredContent: { success: false, error: "Invalid API key", walletId: null as string | null, status: null as string | null },
          content: [{ type: "text", text: "Access request failed: invalid API key." }],
          isError: true,
        };
      }
      if (res.status === 403) {
        return {
          structuredContent: { success: false, error: "User has not joined", walletId: null as string | null, status: null as string | null },
          content: [{ type: "text", text: "Access request failed: user has not joined." }],
          isError: true,
        };
      }
      if (!res.ok) {
        return {
          structuredContent: { success: false, error: `HTTP ${res.status}`, walletId: null as string | null, status: null as string | null },
          content: [{ type: "text", text: `Access request failed: HTTP ${res.status}` }],
          isError: true,
        };
      }
      const wallet = await res.json() as {
        id: string;
        status: string;
        spending_limit: number;
        spent: number;
      };
      return {
        structuredContent: {
          success: true,
          walletId: wallet.id,
          status: wallet.status,
          spendingLimit: wallet.spending_limit,
          spent: wallet.spent,
        },
        content: [{ type: "text", text: `Wallet created: ${wallet.id} (status: ${wallet.status}). Ask the user to check back after admin approval, then call check-wallet to confirm.` }],
      };
    },
  );

server.run();

export type AppType = typeof server;
