# Over The Horizon - Cloudflare Serverless Presence Gateway

A zero-database, serverless live player presence tracker running on Cloudflare Workers and Durable Objects with WebSocket Hibernation.

---

## Features

- **100% Free**: Operates within Cloudflare's free tier quotas with zero monthly fees.
- **Hard Cost Protection**: If the 100,000 daily free requests are ever exceeded, connections gracefully close and the client hides the online badge silently. There are zero surprise overages.
- **Strict Origin Security**: Only connections originating from `https://overthehorizon.srinivasa.dev`, `https://srinivasa.dev`, or `localhost` are accepted. Third-party clone sites receive an immediate `403 Forbidden`.
- **Hardware IP Rate Limiting**: Max 3 concurrent WebSocket connections per `CF-Connecting-IP`. Single-IP bot loops cannot inflate user counts.
- **WebSocket Hibernation**: Idle connections consume 0 CPU and negligible memory at Cloudflare's edge.

---

## 3-Minute Deployment Guide

### Option A: Using Wrangler CLI (Recommended)

1. Make sure you have Node.js installed, then log in to Cloudflare:
   ```bash
   npx wrangler login
   ```
2. Deploy directly from the `cloudflare` directory:
   ```bash
   cd cloudflare
   npx wrangler deploy
   ```
3. Cloudflare will print your live WebSocket endpoint:
   ```text
   Published overthehorizon-presence (https://overthehorizon-presence.<your-subdomain>.workers.dev)
   ```
4. Copy the URL and replace `https://` with `wss://` to use it as your WebSocket endpoint!

---

### Option B: Using the Cloudflare Web Dashboard (No CLI Required)

1. Log into your free [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **Create application** > **Create Worker**.
3. Name your worker `overthehorizon-presence` and click **Deploy**.
4. Click **Edit code**, paste the contents of `cloudflare/src/index.js`, and click **Deploy**.
5. Go to your Worker's **Settings** > **Bindings**:
   - Add a **Durable Object** binding:
     - Variable name: `PRESENCE_ROOM`
     - Class name: `PresenceRoom`
6. Save and deploy. Your endpoint is ready!
