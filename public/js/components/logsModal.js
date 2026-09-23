import { api } from '../api.js';
import { showToast } from './actionModal.js';

/**
 * Mapeo de estilos y etiquetas para acciones y estados en la auditoría
 */
const ACCION_CONFIG = {
  'APERTURA': {
    label: '🟢 Apertura',
    badgeClass: 'log-badge-apertura'
  },
  'CAMBIO_ESTADO': {
    label: '🟠 Cambio Estado',
    badgeClass: 'log-badge-cambio'
  },
  'LIBERACION': {
    label: '✓ Liberación',
    badgeClass: 'log-badge-liberacion'
  }
};

const ESTADO_CONFIG = {
  'LIBRE': { label: 'Libre', color: 'var(--color-libre)' },
  'OCUPADA': { label: 'Ocupada', color: 'var(--color-ocupada)' },
  'CUENTA_PEDIDA': { label: 'Cuenta', color: 'var(--color-cuenta)' },
  'RESERVADA': { label: 'Reservada', color: 'var(--color-reservada)' }
};

/**
 * Formatea fechas/horas de SQLite de forma legible
 */
function formatLogTime(timestampStr) {
  if (!timestampStr) return '--:--';
  const parts = timestampStr.split(' ');
  const date = parts[0] || '';
  const time = parts[1] || '';
  return { date, time };
}

/**
 * Controlador del Modal de Registro de Acciones (Auditoría en Filas)
 */
export class LogsModal {
  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.backdrop = document.getElementById('logs-modal');
    this.btnClose = document.getElementById('logs-btn-close');
    this.btnRefresh = document.getElementById('logs-btn-refresh');
    this.tableBody = document.getElementById('logs-table-body');
    this.logsCountLabel = document.getElementById('logs-count-label');
  }

  bindEvents() {
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

    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => this.refreshLogs(true));
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop?.classList.contains('is-active')) {
        this.close();
      }
    });
  }

  async open() {
    if (!this.backdrop) return;
    this.backdrop.classList.add('is-active');
    await this.refreshLogs(false);
  }

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('is-active');
    }
  }

  async refreshLogs(showNotification = false) {
    if (!this.tableBody) return;

    try {
      if (this.btnRefresh) {
        this.btnRefresh.classList.add('is-spinning');
      }

      const logs = await api.getLogs(80);
      this.renderLogs(logs);

      if (this.logsCountLabel) {
        this.logsCountLabel.textContent = `${logs.length} eventos recientes`;
      }

      if (showNotification) {
        showToast('✓ Registro de auditoría actualizado');
      }
    } catch (err) {
      showToast(`Error al cargar registro: ${err.message}`, true);
    } finally {
      if (this.btnRefresh) {
        setTimeout(() => {
          this.btnRefresh.classList.remove('is-spinning');
        }, 400);
      }
    }
  }

  renderLogs(logs) {
    if (!this.tableBody) return;

    if (!logs || logs.length === 0) {
      this.tableBody.innerHTML = `
        <div class="logs-empty-state">
          No hay acciones registradas aún en el sistema.
        </div>
      `;
      return;
    }

    this.tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    logs.forEach((log) => {
      const row = document.createElement('div');
      row.className = 'log-row';

      const { date, time } = formatLogTime(log.timestamp);
      const accion = ACCION_CONFIG[log.tipo_accion] || { label: log.tipo_accion, badgeClass: '' };
      const anterior = ESTADO_CONFIG[log.estado_anterior] || { label: log.estado_anterior || '--', color: '#6b7280' };
      const nuevo = ESTADO_CONFIG[log.estado_nuevo] || { label: log.estado_nuevo, color: '#6b7280' };

      const formattedConsumo = log.consumo_estimado > 0
        ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(log.consumo_estimado)
        : '';

      row.innerHTML = `
        <div class="log-col-time">
          <span class="log-time">${time}</span>
          <span class="log-date">${date}</span>
        </div>
        <div class="log-col-mesa">
          <span class="log-mesa-badge">Mesa ${log.numero_mesa}</span>
        </div>
        <div class="log-col-accion">
          <span class="log-action-badge ${accion.badgeClass}">${accion.label}</span>
        </div>
        <div class="log-col-transition">
          <span class="log-state-tag" style="background-color: ${anterior.color}">${anterior.label}</span>
          <span class="log-arrow">➜</span>
          <span class="log-state-tag" style="background-color: ${nuevo.color}">${nuevo.label}</span>
        </div>
        <div class="log-col-detail">
          ${formattedConsumo ? `<strong class="log-consumo-tag">${formattedConsumo}</strong>` : ''}
          ${log.notas ? `<span class="log-notas-text">${log.notas}</span>` : (!formattedConsumo ? '<span class="log-empty-detail">—</span>' : '')}
        </div>
      `;

      fragment.appendChild(row);
    });

    this.tableBody.appendChild(fragment);
  }
}
