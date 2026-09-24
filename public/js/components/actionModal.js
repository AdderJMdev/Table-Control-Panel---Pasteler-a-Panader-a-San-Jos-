import { api } from '../api.js';
import { store } from '../state.js';

/**
 * Muestra notificación flotante (Toast)
 */
export function showToast(message, isError = false) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Controlador del Modal Táctil de Acciones de Mesa (RF-04, RF-05, RF-06, RF-07)
 */
export class ActionModal {
  constructor() {
    this.currentMesa = null;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.backdrop = document.getElementById('action-modal');
    this.mesaNumber = document.getElementById('modal-mesa-number');
    this.stateBadge = document.getElementById('modal-state-badge');
    this.btnClose = document.getElementById('modal-btn-close');

    // Botones de acción rápida
    this.btnOcupar = document.getElementById('btn-action-ocupar');
    this.btnCuenta = document.getElementById('btn-action-cuenta');
    this.btnLiberar = document.getElementById('btn-action-liberar');
    this.btnReservar = document.getElementById('btn-action-reservar');

    // Formulario de consumo / notas (RF-07)
    this.inputConsumo = document.getElementById('modal-input-consumo');
    this.inputNotas = document.getElementById('modal-input-notas');
    this.btnSaveInfo = document.getElementById('btn-save-info');
    this.btnClearConsumo = document.getElementById('btn-clear-consumo');
    this.quickProductsContainer = document.getElementById('modal-quick-products');
    this.quickAmountsContainer = document.getElementById('modal-quick-amounts');
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

    // Acción: Ocupar Mesa (RF-04)
    if (this.btnOcupar) {
      this.btnOcupar.addEventListener('click', () => this.handleEstadoChange('OCUPADA'));
    }

    // Acción: Pedir Cuenta (RF-05)
    if (this.btnCuenta) {
      this.btnCuenta.addEventListener('click', () => this.handleEstadoChange('CUENTA_PEDIDA'));
    }

    // Acción: Liberar Mesa (RF-06)
    if (this.btnLiberar) {
      this.btnLiberar.addEventListener('click', () => this.handleLiberar());
    }

    // Acción: Reservar Mesa
    if (this.btnReservar) {
      this.btnReservar.addEventListener('click', () => this.handleEstadoChange('RESERVADA'));
    }

    // Guardar Consumo y Notas (RF-07)
    if (this.btnSaveInfo) {
      this.btnSaveInfo.addEventListener('click', () => this.handleSaveInfo());
    }

    // Limpiar Consumo
    if (this.btnClearConsumo) {
      this.btnClearConsumo.addEventListener('click', () => {
        if (this.inputConsumo) this.inputConsumo.value = '';
        if (this.inputNotas) this.inputNotas.value = '';
        showToast('Consumo y notas reiniciados');
      });
    }

    // Tecla Escape para cerrar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop?.classList.contains('is-active')) {
        this.close();
      }
    });

    // Actualizar botones rápidos en vivo si otro dispositivo cambia los montos
    store.subscribe(() => {
      if (this.isVisible()) {
        this.renderQuickProducts();
        this.renderQuickAmounts();
      }
    });
  }

  isVisible() {
    return !!(this.backdrop && this.backdrop.classList.contains('is-active'));
  }

  open(mesa) {
    this.currentMesa = mesa;
    if (!this.backdrop) return;

    if (this.mesaNumber) {
      this.mesaNumber.textContent = `Mesa ${mesa.numero}`;
    }

    if (this.stateBadge) {
      this.stateBadge.textContent = mesa.estado;
      this.stateBadge.className = 'modal-state-badge';
      if (mesa.estado === 'LIBRE') this.stateBadge.style.backgroundColor = 'var(--color-libre)';
      else if (mesa.estado === 'OCUPADA') this.stateBadge.style.backgroundColor = 'var(--color-ocupada)';
      else if (mesa.estado === 'CUENTA_PEDIDA') this.stateBadge.style.backgroundColor = 'var(--color-cuenta)';
      else if (mesa.estado === 'RESERVADA') this.stateBadge.style.backgroundColor = 'var(--color-reservada)';
    }

    if (this.inputConsumo) {
      this.inputConsumo.value = mesa.consumo_estimado ? Number(mesa.consumo_estimado).toFixed(2) : '';
    }

    if (this.inputNotas) {
      this.inputNotas.value = mesa.notas || '';
    }

    // Visibilidad condicional de botones según estado actual
    this.adjustButtonVisibility(mesa.estado);

    // Cargar productos rápidos del inventario y montos rápidos
    this.renderQuickProducts();
    this.renderQuickAmounts();

    this.backdrop.classList.add('is-active');
  }

  renderQuickAmounts() {
    if (!this.quickAmountsContainer) return;

    const amounts = store.getState().quickAmounts || [];

    this.quickAmountsContainer.innerHTML = '';
    if (amounts.length === 0) {
      this.quickAmountsContainer.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-secondary); padding: 4px 0;">
          No hay montos rápidos configurados (Ajustes → ⚡ Acc. Rápidos).
        </div>
      `;
      return;
    }

    const formatter = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    const fragment = document.createDocumentFragment();
    amounts.forEach((amount) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-quick-amount touch-btn';
      btn.textContent = `+ S/ ${formatter.format(amount)}`;

      btn.addEventListener('click', () => {
        const current = Number(this.inputConsumo.value || 0);
        const next = current + Number(amount);
        this.inputConsumo.value = next.toFixed(2);
        showToast(`+ S/ ${formatter.format(amount)}`);
      });

      fragment.appendChild(btn);
    });

    this.quickAmountsContainer.appendChild(fragment);
  }

  renderQuickProducts() {
    if (!this.quickProductsContainer) return;
    const productos = store.getState().productos || [];

    if (productos.length === 0) {
      this.quickProductsContainer.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-secondary); padding: 6px 0;">
          No hay productos configurados en Ajustes.
        </div>
      `;
      return;
    }

    this.quickProductsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    productos.forEach((prod) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-prod-chip touch-btn';
      const formattedPrice = new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
      }).format(prod.precio);

      btn.innerHTML = `
        <span class="chip-name">${prod.nombre}</span>
        <span class="chip-price">${formattedPrice}</span>
      `;

      btn.addEventListener('click', () => {
        // Sumar al input de consumo
        const currentConsumo = Number(this.inputConsumo.value || 0);
        const newConsumo = (currentConsumo + Number(prod.precio)).toFixed(2);
        this.inputConsumo.value = newConsumo;

        // Añadir producto a notas
        const currentNotas = this.inputNotas.value.trim();
        if (currentNotas) {
          this.inputNotas.value = `${currentNotas}, ${prod.nombre}`;
        } else {
          this.inputNotas.value = prod.nombre;
        }

        // Feedback táctil breve
        showToast(`+ ${prod.nombre} (${formattedPrice})`);
      });

      fragment.appendChild(btn);
    });

    this.quickProductsContainer.appendChild(fragment);
  }

  adjustButtonVisibility(estado) {
    if (estado === 'LIBRE') {
      if (this.btnOcupar) {
        this.btnOcupar.style.display = 'flex';
        this.btnOcupar.textContent = '🟢 Abrir Mesa (Ocupar)';
        this.btnOcupar.style.gridColumn = 'span 2';
      }
      if (this.btnCuenta) this.btnCuenta.style.display = 'none';
      if (this.btnLiberar) this.btnLiberar.style.display = 'none';
      if (this.btnReservar) {
        this.btnReservar.style.display = 'flex';
        this.btnReservar.style.gridColumn = 'span 2';
      }
    } else if (estado === 'OCUPADA') {
      if (this.btnOcupar) this.btnOcupar.style.display = 'none';
      if (this.btnCuenta) {
        this.btnCuenta.style.display = 'flex';
        this.btnCuenta.style.gridColumn = 'span 1';
      }
      if (this.btnLiberar) {
        this.btnLiberar.style.display = 'flex';
        this.btnLiberar.style.gridColumn = 'span 1';
      }
      if (this.btnReservar) this.btnReservar.style.display = 'none';
    } else if (estado === 'CUENTA_PEDIDA') {
      if (this.btnOcupar) {
        this.btnOcupar.style.display = 'flex';
        this.btnOcupar.textContent = 'Volver a Ocupada';
        this.btnOcupar.style.gridColumn = 'span 1';
      }
      if (this.btnCuenta) this.btnCuenta.style.display = 'none';
      if (this.btnLiberar) {
        this.btnLiberar.style.display = 'flex';
        this.btnLiberar.style.gridColumn = 'span 1';
      }
      if (this.btnReservar) this.btnReservar.style.display = 'none';
    } else if (estado === 'RESERVADA') {
      if (this.btnOcupar) {
        this.btnOcupar.style.display = 'flex';
        this.btnOcupar.textContent = 'Ocupar (Cliente Llegó)';
        this.btnOcupar.style.gridColumn = 'span 1';
      }
      if (this.btnCuenta) this.btnCuenta.style.display = 'none';
      if (this.btnLiberar) {
        this.btnLiberar.style.display = 'flex';
        this.btnLiberar.textContent = 'Cancelar Reserva';
        this.btnLiberar.style.gridColumn = 'span 1';
      }
      if (this.btnReservar) this.btnReservar.style.display = 'none';
    }
  }

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('is-active');
    }
    this.currentMesa = null;
  }

  async handleEstadoChange(nuevoEstado) {
    if (!this.currentMesa) return;
    const mesaId = this.currentMesa.id;
    const numero = this.currentMesa.numero;

    try {
      const consumo = this.inputConsumo?.value ? parseFloat(this.inputConsumo.value) : undefined;
      const notas = this.inputNotas?.value || undefined;

      const updated = await api.updateEstado(mesaId, {
        estado: nuevoEstado,
        consumo_estimado: consumo,
        notas: notas
      });

      store.updateSingleMesa(updated);
      showToast(`Mesa ${numero} cambiada a ${nuevoEstado}`);
      this.close();
    } catch (err) {
      showToast(`Error al cambiar estado: ${err.message}`, true);
    }
  }

  async handleLiberar() {
    if (!this.currentMesa) return;
    const mesaId = this.currentMesa.id;
    const numero = this.currentMesa.numero;

    try {
      const updated = await api.liberarMesa(mesaId);
      store.updateSingleMesa(updated);
      showToast(`Mesa ${numero} liberada correctamente`);
      this.close();
    } catch (err) {
      showToast(`Error al liberar mesa: ${err.message}`, true);
    }
  }

  async handleSaveInfo() {
    if (!this.currentMesa) return;
    const mesaId = this.currentMesa.id;
    const numero = this.currentMesa.numero;

    try {
      const consumo = this.inputConsumo?.value ? parseFloat(this.inputConsumo.value) : 0;
      const notas = this.inputNotas?.value || '';

      const updated = await api.updateEstado(mesaId, {
        estado: this.currentMesa.estado,
        consumo_estimado: consumo,
        notas: notas
      });

      store.updateSingleMesa(updated);
      showToast(`Datos de Mesa ${numero} guardados`);
      this.close();
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, true);
    }
  }
}
