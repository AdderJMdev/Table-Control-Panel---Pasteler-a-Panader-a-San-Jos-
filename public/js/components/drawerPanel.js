/**
 * Controlador del Panel Oculto Lateral Izquierdo (Drawer)
 * Se despliega al hacer clic en el título e icono de "Pastelería San José"
 */
export class DrawerPanel {
  constructor({ onRefreshMesas, onOpenLogs, onOpenSettings }) {
    this.onRefreshMesas = onRefreshMesas;
    this.onOpenLogs = onOpenLogs;
    this.onOpenSettings = onOpenSettings;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.brandButton = document.getElementById('brand-button');
    this.backdrop = document.getElementById('left-drawer-backdrop');
    this.drawer = document.getElementById('left-drawer');
    this.btnClose = document.getElementById('drawer-btn-close');

    // Botones de acción del panel
    this.btnRefresh = document.getElementById('drawer-btn-refresh');
    this.btnLogs = document.getElementById('drawer-btn-logs');
    this.btnSettings = document.getElementById('drawer-btn-settings');
  }

  bindEvents() {
    // Abrir panel al pulsar título/icono
    if (this.brandButton) {
      this.brandButton.addEventListener('click', () => this.open());
    }

    // Cerrar panel
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close();
        }
      });
    }

    // Acción: Actualizar Mapa de Mesas
    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', async () => {
        if (typeof this.onRefreshMesas === 'function') {
          this.btnRefresh.classList.add('is-spinning');
          await this.onRefreshMesas(true);
          setTimeout(() => {
            this.btnRefresh.classList.remove('is-spinning');
            this.close();
          }, 350);
        }
      });
    }

    // Acción: Mostrar Registro de Acciones (Auditoría)
    if (this.btnLogs) {
      this.btnLogs.addEventListener('click', () => {
        this.close();
        if (typeof this.onOpenLogs === 'function') {
          this.onOpenLogs();
        }
      });
    }

    // Acción: Ajustes del Sistema
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        this.close();
        if (typeof this.onOpenSettings === 'function') {
          this.onOpenSettings();
        }
      });
    }

    // Escuchar Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop?.classList.contains('is-active')) {
        this.close();
      }
    });
  }

  open() {
    if (!this.backdrop) return;
    this.backdrop.classList.add('is-active');
  }

  close() {
    if (!this.backdrop) return;
    this.backdrop.classList.remove('is-active');
  }
}
