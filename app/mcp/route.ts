import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcpRequest } from "@/app/lib/mcp-auth";
import { createCofounderMcpServer } from "@/app/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedHosts = new Set([
  "cofounder.exchange",
  "cofounder-exchange.fly.dev",
  "localhost",
  "127.0.0.1",
]);

function cors(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    "Authorization, Content-Type, Last-Event-ID, MCP-Protocol-Version, MCP-Session-Id",
  );
  headers.set("access-control-expose-headers", "MCP-Protocol-Version, MCP-Session-Id");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function requestHostname(request: Request) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwarded || request.headers.get("host") || "";
  if (host.startsWith("[")) return host.slice(1, host.indexOf("]"));
  return host.split(":")[0];
}

function jsonError(status: number, message: string, authenticate = false) {
  const headers = new Headers({ "content-type": "application/json" });
  if (authenticate) headers.set("www-authenticate", 'Bearer realm="Cofounder Exchange MCP"');
  return cors(
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: status === 401 ? -32001 : -32000, message },
        id: null,
      }),
      { status, headers },
    ),
  );
}

async function handleMcp(request: Request) {
  if (!allowedHosts.has(requestHostname(request))) return jsonError(403, "Host is not allowed.");
  const user = await authenticateMcpRequest(request);
  if (!user) return jsonError(401, "A valid Cofounder Exchange MCP bearer token is required.", true);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createCofounderMcpServer(user.id);
  await server.connect(transport);
  return cors(await transport.handleRequest(request));
}

export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
