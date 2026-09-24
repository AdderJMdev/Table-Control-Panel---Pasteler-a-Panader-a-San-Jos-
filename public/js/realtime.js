import { store } from './state.js';
import { api } from './api.js';

const MAX_RETRY_DELAY = 10000;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Cliente WebSocket para sincronizar en tiempo real todos los
 * dispositivos conectados al mismo servidor local (multi-pantalla).
 */
export class RealtimeClient {
  constructor() {
    this.socket = null;
    this.retryTimer = null;
    this.retryDelay = INITIAL_RETRY_DELAY;
  }

  get url() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws`;
  }

  connect() {
    if (this.socket) return;

    try {
      this.socket = new WebSocket(this.url);
    } catch (err) {
      console.warn('[Realtime] No se pudo abrir WebSocket:', err.message);
      return this.scheduleReconnect();
    }

    this.socket.addEventListener('open', () => {
      this.retryDelay = INITIAL_RETRY_DELAY;
      store.setOnline(true);
      store.setWsStatus({ connected: true, devices: null });
      console.log('[Realtime] Conectado al servidor en tiempo real.');
    });

    this.socket.addEventListener('message', (event) => this.handleMessage(event.data));

    this.socket.addEventListener('close', () => {
      this.socket = null;
      store.setWsStatus({ connected: false, devices: null });
      console.warn('[Realtime] Conexión cerrada, reintentando...');
      this.scheduleReconnect();
    });

    this.socket.addEventListener('error', () => {
      this.socket?.close();
    });
  }

  handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'welcome':
        store.setWsStatus({ connected: true, devices: msg.data?.clients ?? null });
        break;

      case 'mesas:updated':
        this.applyMesaUpdated(msg.data);
        break;

      case 'mesas:set':
        if (Array.isArray(msg.data)) {
          store.setMesas(msg.data);
        }
        break;

      case 'productos:updated':
        this.applyProductos(msg.data);
        break;

      case 'quick-amounts:set':
        if (Array.isArray(msg.data)) {
          store.setQuickAmounts(msg.data);
        }
        break;
    }
  }

  applyMesaUpdated(mesa) {
    if (!mesa || mesa.id === undefined) return;

    // Si la mesa ya está en el store, actualizarla en sitio.
    // En el arranque (mesas aún no cargadas) se refresca la lista completa.
    const exists = store.getState().mesas.some((m) => m.id === mesa.id);
    if (exists) {
      store.updateSingleMesa(mesa);
    } else {
      api.getMesas()
        .then((mesas) => store.setMesas(mesas))
        .catch((err) => console.warn('[Realtime] Fallo al refrescar mesas:', err.message));
    }
  }

  applyProductos({ action, producto } = {}) {
    if (!producto) return;
    switch (action) {
      case 'create':
        store.addProducto(producto);
        break;
      case 'update':
        store.updateProductoInStore(producto);
        break;
      case 'delete':
        store.removeProductoFromStore(producto.id);
        break;
    }
  }

  scheduleReconnect() {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY);
  }
}

export const realtimeClient = new RealtimeClient();