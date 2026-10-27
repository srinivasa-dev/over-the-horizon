/**
 * Over The Horizon - Cloudflare Serverless Presence Gateway
 * 
 * Zero-Database Real-Time Active Player Counter
 * Built on Cloudflare Workers & Durable Objects with WebSocket Hibernation
 * 
 * Features:
 * - Strict Origin Validation (blocks cross-site hotlinking and theft)
 * - Per-IP Connection Limit (max 3 connections per CF-Connecting-IP)
 * - WebSocket Hibernation (zero CPU/memory consumption while idle)
 * - Ping/Pong Heartbeat Watchdog
 * - Graceful fallback HTTP status endpoint
 */

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === "overthehorizon.srinivasa.dev" || host === "srinivasa.dev" || host.endsWith(".srinivasa.dev")) return true;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;
    if (/^192\.168\.\d+\.\d+$/.test(host) || /^10\.\d+\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

export class PresenceRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ipCounts = new Map(); // ip -> connection count
  }

  async fetch(request) {
    const origin = request.headers.get("Origin");

    // 1. Security: Block Unauthorized Origins (allows production domains, localhost & LAN IPs)
    if (origin && !isAllowedOrigin(origin)) {
      return new Response("Forbidden: Invalid Origin", { 
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // 2. HTTP Health & Status Endpoint
    if (request.headers.get("Upgrade") !== "websocket") {
      const sockets = this.state.getWebSockets();
      return new Response(JSON.stringify({
        status: "ok",
        service: "Over The Horizon Presence Gateway",
        onlineExplorers: sockets.length,
        timestamp: Date.now()
      }), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin || "*",
          "Cache-Control": "no-store"
        }
      });
    }

    // 3. Security: Per-IP Concurrency Limit (Max 3 concurrent sockets)
    const clientIP = request.headers.get("CF-Connecting-IP") || "local";
    const currentFromIP = this.ipCounts.get(clientIP) || 0;
    if (currentFromIP >= 3) {
      return new Response("Too many connections from this IP", { 
        status: 429,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // 4. Accept WebSocket with Edge Hibernation
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server, [clientIP]);
    this.ipCounts.set(clientIP, currentFromIP + 1);

    // Broadcast updated presence to all connected explorers
    this.broadcastCount();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      // Handle client keep-alive ping
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", time: Date.now() }));
      }
    } catch (e) {
      // Ignore invalid payloads
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    const tags = this.state.getTags(ws);
    const ip = tags && tags[0];
    if (ip && this.ipCounts.has(ip)) {
      const current = this.ipCounts.get(ip) - 1;
      if (current <= 0) {
        this.ipCounts.delete(ip);
      } else {
        this.ipCounts.set(ip, current);
      }
    }
    // Broadcast updated presence count
    this.broadcastCount();
  }

  async webSocketError(ws, error) {
    try {
      ws.close(1011, "WebSocket error");
    } catch (e) {}
  }

  broadcastCount() {
    const sockets = this.state.getWebSockets();
    const count = Math.max(1, sockets.length);
    const payload = JSON.stringify({ 
      type: "presence", 
      count: count,
      timestamp: Date.now()
    });

    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch (err) {}
    }
  }
}

export default {
  async fetch(request, env) {
    // Route to global singleton PresenceRoom
    const id = env.PRESENCE_ROOM.idFromName("global-presence");
    const room = env.PRESENCE_ROOM.get(id);
    return room.fetch(request);
  }
};
