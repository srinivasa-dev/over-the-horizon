/**
 * Over The Horizon - Real-Time Presence Client
 * 
 * Manages live concurrent explorer count via Cloudflare Serverless WebSocket Gateway.
 * Fully silent fail-safe: If the server is offline, unreachable, or rate-limited,
 * the badge is quietly hidden with zero disruption to gameplay or rendering.
 */

export class PresenceTracker {
  constructor(options = {}) {
    this.endpoint = options.endpoint || this._resolveEndpoint();
    this.ws = null;
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 120000; // 2 minutes max backoff
    this.onlineCount = 0;
    this.isConnected = false;

    // UI elements
    this.menuPill = document.getElementById('carousel-presence-pill');
    this.menuCount = document.getElementById('presence-online-count');
    this.hudPill = document.getElementById('hud-presence-pill');
    this.hudCount = document.getElementById('hud-online-count');

    // Only attempt connection if a valid endpoint is configured or in dev
    if (this.endpoint) {
      this.connect();
    }
  }

  _resolveEndpoint() {
    // 1. Check window global configuration
    if (typeof window !== 'undefined' && window.PRESENCE_WS_URL) {
      return window.PRESENCE_WS_URL;
    }

    // 2. Check HTML meta tag <meta name="presence-ws-url" content="...">
    const metaTag = document.querySelector('meta[name="presence-ws-url"]');
    if (metaTag && metaTag.content) {
      return metaTag.content;
    }

    // 3. Localhost development fallback
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'ws://localhost:8787';
    }

    // 4. Production Cloudflare Worker default endpoint
    return 'wss://overthehorizon-presence.sriyadav98.workers.dev';
  }

  connect() {
    if (!this.endpoint) return;

    try {
      this._cleanup();
      this.ws = new WebSocket(this.endpoint);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'presence' && typeof data.count === 'number') {
            this.onlineCount = Math.max(1, data.count);
            this.updateUI(this.onlineCount);
          }
        } catch (e) {
          // Silent catch
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this._stopHeartbeat();
        this.hideUI();

        // If explicitly rejected (403 Forbidden or 429 Throttled), avoid rapid retry
        if (event.code === 4403 || event.code === 4429 || event.code === 1008) {
          return;
        }

        this._scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Silent fail-safe: quietly hide UI on error
        this.hideUI();
      };
    } catch (err) {
      // Graceful offline fallback
      this.hideUI();
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {}
      }
    }, 30000); // Send ping every 30 seconds
  }

  _stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    // Exponential backoff: 10s, 20s, 40s... capped at 2 minutes
    this.reconnectAttempts++;
    const delay = Math.min(10000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  _cleanup() {
    this._stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  updateUI(count) {
    const text = `${count} ${count === 1 ? 'Explorer' : 'Explorers'} Online`;

    if (this.menuCount) this.menuCount.textContent = text;
    if (this.hudCount) this.hudCount.textContent = text;

    if (this.menuPill) {
      this.menuPill.classList.remove('hidden');
      this.menuPill.style.display = 'inline-flex';
    }
    if (this.hudPill) {
      this.hudPill.classList.remove('hidden');
      this.hudPill.style.display = 'inline-flex';
    }
  }

  hideUI() {
    if (this.menuPill) {
      this.menuPill.classList.add('hidden');
      this.menuPill.style.display = 'none';
    }
    if (this.hudPill) {
      this.hudPill.classList.add('hidden');
      this.hudPill.style.display = 'none';
    }
  }

  destroy() {
    this._cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.hideUI();
  }
}
