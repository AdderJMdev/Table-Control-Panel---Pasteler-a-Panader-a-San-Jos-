import { WebSocketServer, WebSocket } from 'ws';

const WS_PATH = '/ws';
const PING_INTERVAL_MS = 30000;

/**
 * Hub WebSocket para sincronización en tiempo real entre todos los
 * dispositivos de la red local (multi-pantalla PWA).
 */
class RealtimeHub {
  constructor() {
    this.wss = null;
    this.pingTimer = null;
  }

  /**
   * Monta el servidor WebSocket sobre el HTTP server nativo
   */
  init(httpServer) {
    if (this.wss) return;

    this.wss = new WebSocketServer({
      server: httpServer,
      path: WS_PATH,
      clientTracking: true,
      maxPayload: 64 * 1024
    });

    this.wss.on('connection', (socket, req) => {
      if (!this.isAllowedOrigin(req.headers.origin, req.headers.host)) {
        socket.close(1008, 'Origen no permitido.');
        return;
      }

      socket.isAlive = true;
      socket.on('pong', () => { socket.isAlive = true; });
      socket.on('error', () => {});
      socket.on('close', () => {
        console.log(`[Realtime] Dispositivo desconectado (conectados: ${this.wss.clients.size})`);
      });

      console.log(`[Realtime] Dispositivo conectado (conectados: ${this.wss.clients.size})`);
      this.send(socket, {
        type: 'welcome',
        data: { clients: this.wss.clients.size }
      });
    });

    this.wss.on('error', (err) => {
      console.error('[Realtime] Error del servidor WebSocket:', err.message);
    });

    // Keep-alive: descarta clientes muertos cada 30s
    this.pingTimer = setInterval(() => {
      for (const socket of this.wss.clients) {
        if (socket.isAlive === false) {
          socket.terminate();
          continue;
        }
        socket.isAlive = false;
        socket.ping();
      }
    }, PING_INTERVAL_MS);
    this.wss.on('close', () => clearInterval(this.pingTimer));
  }

  /**
   * Solo permite conexiones de páginas servidas por este mismo servidor
   * (previene que sitios externos abusen del canal).
   */
  isAllowedOrigin(origin, host) {
    if (!origin) return true; // Clientes no navegador
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  /**
   * Emite un mensaje JSON a todos los clientes conectados
   */
  broadcast(payload) {
    if (!this.wss) return;
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        this.send(client, message);
      }
    }
  }

  send(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
  }

  getClientCount() {
    return this.wss ? this.wss.clients.size : 0;
  }
}

export const realtime = new RealtimeHub();