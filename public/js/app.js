import { api } from './api.js';
import { store } from './state.js';
import { realtimeClient } from './realtime.js';
import { pinScreen } from './components/pinScreen.js';
import { TableGrid } from './components/tableGrid.js';
import { ActionModal, showToast } from './components/actionModal.js';
import { SettingsModal } from './components/settingsModal.js';
import { LogsModal } from './components/logsModal.js';
import { DrawerPanel } from './components/drawerPanel.js';

/**
 * Inicialización de la Aplicación PWA Vanilla (RNF-03, RNF-04)
 */
class App {
  constructor() {
    this.tableGrid = null;
    this.actionModal = null;
    this.settingsModal = null;
    this.logsModal = null;
    this.drawerPanel = null;
    this.clockEl = document.getElementById('live-clock');
    this.onlineIndicator = document.getElementById('online-indicator');
    this.onlineText = document.getElementById('online-text');
  }

  /**
   * Desbloqueo de la app: exige el PIN de acceso (o clave maestra) una vez
   * por sesión antes de inicializar la interfaz.
   */
  async boot() {
    const alreadyUnlocked = sessionStorage.getItem('san_jose_unlocked') === '1';
    if (!alreadyUnlocked) {
      try {
        await pinScreen.requestPin({
          subtitle: 'Ingrese su PIN de acceso',
          validate: (pin) => api.verifyPin(pin).then(() => true)
        });
        sessionStorage.setItem('san_jose_unlocked', '1');
      } catch (err) {
        console.warn('[App] Error durante autenticación:', err.message);
      }
    }
    await this.init();
  }

  async init() {
    console.log('[App] Inicializando Panel de Mesas - Pastelería San José...');

    // 1. Inicializar Modales
    this.actionModal = new ActionModal();
    this.settingsModal = new SettingsModal();
    this.logsModal = new LogsModal();

    // 2. Inicializar Panel Lateral Oculto (Drawer)
    this.drawerPanel = new DrawerPanel({
      onRefreshMesas: (notify) => this.refreshMesas(notify),
      onOpenLogs: () => this.logsModal.open(),
      onOpenSettings: () => this.settingsModal.open()
    });

    // 3. Inicializar Grid de Mesas
    const gridContainer = document.getElementById('table-grid');
    this.tableGrid = new TableGrid(gridContainer, (mesa) => {
      this.actionModal.open(mesa);
    });

    // 4. Suscribirse a cambios en el Store reactivo
    store.subscribe((state) => {
      this.tableGrid.render(state.mesas, state.filter);
      this.updateOnlineStatus(state);
      if (this.updateClockDisplay) {
        this.updateClockDisplay();
      }
    });

    // 5. Activar sincronización en tiempo real entre dispositivos (WebSocket)
    realtimeClient.connect();

    // 6. Configurar eventos de conectividad
    this.setupEvents();

    // 7. Iniciar reloj en tiempo real
    this.startClock();

    // 8. Registrar Service Worker para soporte PWA Offline
    this.registerServiceWorker();

    // 9. Cargar datos iniciales (Mesas, Productos y Montos Rápidos)
    await Promise.all([
      this.refreshMesas(false),
      this.refreshProductos(),
      this.refreshQuickAmounts()
    ]);
  }

  setupEvents() {
    // Monitoreo de conectividad local
    window.addEventListener('online', () => store.setOnline(true));
    window.addEventListener('offline', () => store.setOnline(false));

    // Filtros rápidos si existen en la interfaz
    const filterButtons = document.querySelectorAll('.filter-pill');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filterValue = btn.getAttribute('data-filter') || 'TODAS';
        store.setFilter(filterValue);
      });
    });
  }

  /**
   * Refresca la lista de mesas desde la base de datos local SQLite (RF-03)
   */
  async refreshMesas(showNotification = false) {
    try {
      const mesas = await api.getMesas();
      store.setMesas(mesas);

      if (showNotification) {
        showToast('✓ Mapa de mesas sincronizado');
      }
    } catch (err) {
      showToast('Error al refrescar mesas: ' + err.message, true);
    }
  }

  /**
   * Carga los productos activos en el store para uso inmediato
   */
  async refreshProductos() {
    try {
      const productos = await api.getProductos(false);
      store.setProductos(productos);
    } catch (err) {
      console.warn('[App] No se pudieron precargar productos:', err);
    }
  }

  /**
   * Carga los montos de los botones de acceso rápido
   */
  async refreshQuickAmounts() {
    try {
      const amounts = await api.getQuickAmounts();
      store.setQuickAmounts(amounts);
    } catch (err) {
      console.warn('[App] No se pudieron cargar montos rápidos:', err);
    }
  }

  startClock() {
    this.updateClockDisplay = () => {
      if (this.clockEl) {
        const now = new Date();
        const { clockFormat } = store.getState();

        if (clockFormat === '12h') {
          let hours = now.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const strHours = String(hours).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          this.clockEl.textContent = `${strHours}:${minutes}:${seconds} ${ampm}`;
        } else {
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          this.clockEl.textContent = `${hours}:${minutes}:${seconds}`;
        }
      }
    };

    this.updateClockDisplay();
    setInterval(this.updateClockDisplay, 1000);
  }

  updateOnlineStatus(state) {
    if (!this.onlineIndicator || !this.onlineText) return;

    const { isOnline, wsStatus } = state;
    const wsConnected = !!wsStatus?.connected;

    if (!isOnline) {
      this.onlineIndicator.className = 'online-dot offline-dot';
      this.onlineText.textContent = 'Modo Desconectado';
      return;
    }

    if (wsConnected) {
      this.onlineIndicator.className = 'online-dot';
      const devices = wsStatus.devices;
      if (devices && devices > 1) {
        this.onlineText.textContent = `Servidor Local · ${devices} dispositivos`;
      } else {
        this.onlineText.textContent = 'Servidor Local Conectado';
      }
    } else {
      this.onlineIndicator.className = 'online-dot offline-dot';
      this.onlineText.textContent = 'Conectando al servidor...';
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('[SW] ServiceWorker registrado con éxito:', registration.scope);
          })
          .catch((err) => {
            console.warn('[SW] Fallo al registrar ServiceWorker:', err);
          });
      });
    }
  }
}

// Iniciar aplicación al cargar el DOM (primero desbloquear con PIN)
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.boot();
});
