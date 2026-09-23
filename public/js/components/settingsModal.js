import { api } from '../api.js';
import { store } from '../state.js';
import { showToast } from './actionModal.js';

/**
 * Modal de Ajustes: Configuración de Mesas, Inventario de Productos y Sistema (Touch-First)
 */
export class SettingsModal {
  constructor() {
    this.currentTotal = 16;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.backdrop = document.getElementById('settings-modal');
    this.btnClose = document.getElementById('settings-btn-close');

    // Tabs táctiles
    this.tabBtnMesas = document.getElementById('tab-btn-mesas');
    this.tabBtnProductos = document.getElementById('tab-btn-productos');
    this.tabBtnSistema = document.getElementById('tab-btn-sistema');

    this.tabContentMesas = document.getElementById('tab-content-mesas');
    this.tabContentProductos = document.getElementById('tab-content-productos');
    this.tabContentSistema = document.getElementById('tab-content-sistema');

    // Sección Mesas
    this.inputTotalMesas = document.getElementById('input-total-mesas');
    this.btnMesasMinus = document.getElementById('btn-mesas-minus');
    this.btnMesasPlus = document.getElementById('btn-mesas-plus');
    this.btnSaveMesas = document.getElementById('btn-save-mesas-config');
    this.presetButtons = document.querySelectorAll('.btn-preset-mesas');

    // Sección Inventario / Productos
    this.formAddProduct = document.getElementById('form-add-product');
    this.inputProdNombre = document.getElementById('input-prod-nombre');
    this.inputProdPrecio = document.getElementById('input-prod-precio');
    this.selectProdCategoria = document.getElementById('select-prod-categoria');
    this.btnAddProduct = document.getElementById('btn-add-product');
    this.productsListContainer = document.getElementById('products-list-container');

    // Sección Sistema (Reloj y Tema)
    this.btnClock24h = document.getElementById('btn-clock-24h');
    this.btnClock12h = document.getElementById('btn-clock-12h');
    this.btnThemeDark = document.getElementById('btn-theme-dark');
    this.btnThemeLight = document.getElementById('btn-theme-light');
  }

  bindEvents() {
    // Cerrar modal
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

    // Navegación de Tabs
    if (this.tabBtnMesas) {
      this.tabBtnMesas.addEventListener('click', () => this.switchTab('mesas'));
    }
    if (this.tabBtnProductos) {
      this.tabBtnProductos.addEventListener('click', () => this.switchTab('productos'));
    }
    if (this.tabBtnSistema) {
      this.tabBtnSistema.addEventListener('click', () => this.switchTab('sistema'));
    }

    // Stepper de Mesas
    if (this.btnMesasMinus) {
      this.btnMesasMinus.addEventListener('click', () => {
        const current = parseInt(this.inputTotalMesas.value || 1, 10);
        if (current > 1) {
          this.inputTotalMesas.value = current - 1;
        }
      });
    }

    if (this.btnMesasPlus) {
      this.btnMesasPlus.addEventListener('click', () => {
        const current = parseInt(this.inputTotalMesas.value || 1, 10);
        if (current < 100) {
          this.inputTotalMesas.value = current + 1;
        }
      });
    }

    // Atajos de aforo (Presets 12, 16, 20, 24)
    if (this.presetButtons) {
      this.presetButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-mesas');
          if (val && this.inputTotalMesas) {
            this.inputTotalMesas.value = val;
          }
        });
      });
    }

    // Guardar Configuración de Mesas
    if (this.btnSaveMesas) {
      this.btnSaveMesas.addEventListener('click', () => this.handleSaveMesasConfig());
    }

    // Formulario de Agregar Producto al Catálogo
    if (this.btnAddProduct) {
      this.btnAddProduct.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAddProduct();
      });
    }

    // Configuración de Sistema: Formato de Reloj
    if (this.btnClock24h) {
      this.btnClock24h.addEventListener('click', () => {
        store.setClockFormat('24h');
        this.updateSystemControls();
        showToast('✓ Formato de reloj: 24 Horas');
      });
    }

    if (this.btnClock12h) {
      this.btnClock12h.addEventListener('click', () => {
        store.setClockFormat('12h');
        this.updateSystemControls();
        showToast('✓ Formato de reloj: 12 Horas (AM/PM)');
      });
    }

    // Configuración de Sistema: Tema Claro / Oscuro
    if (this.btnThemeDark) {
      this.btnThemeDark.addEventListener('click', () => {
        store.setTheme('dark');
        this.updateSystemControls();
        showToast('✓ Tema Oscuro activado');
      });
    }

    if (this.btnThemeLight) {
      this.btnThemeLight.addEventListener('click', () => {
        store.setTheme('light');
        this.updateSystemControls();
        showToast('✓ Tema Claro activado');
      });
    }

    // Escuchar Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop?.classList.contains('is-active')) {
        this.close();
      }
    });
  }

  switchTab(tab) {
    // Resetear clases de tabs
    this.tabBtnMesas.classList.remove('active');
    this.tabBtnProductos.classList.remove('active');
    this.tabBtnSistema.classList.remove('active');

    this.tabContentMesas.style.display = 'none';
    this.tabContentProductos.style.display = 'none';
    this.tabContentSistema.style.display = 'none';

    if (tab === 'mesas') {
      this.tabBtnMesas.classList.add('active');
      this.tabContentMesas.style.display = 'flex';
    } else if (tab === 'productos') {
      this.tabBtnProductos.classList.add('active');
      this.tabContentProductos.style.display = 'flex';
      this.renderProductsList();
    } else if (tab === 'sistema') {
      this.tabBtnSistema.classList.add('active');
      this.tabContentSistema.style.display = 'flex';
      this.updateSystemControls();
    }
  }

  async open() {
    if (!this.backdrop) return;

    // Cargar mesas actuales
    const mesas = store.getState().mesas;
    this.currentTotal = mesas.length || 16;
    if (this.inputTotalMesas) {
      this.inputTotalMesas.value = this.currentTotal;
    }

    // Cargar productos del inventario
    await this.refreshProducts();

    // Actualizar botones de sistema
    this.updateSystemControls();

    // Default a tab de mesas
    this.switchTab('mesas');

    this.backdrop.classList.add('is-active');
  }

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('is-active');
    }
  }

  updateSystemControls() {
    const { clockFormat, theme } = store.getState();

    // Actualizar botones de reloj
    if (this.btnClock24h && this.btnClock12h) {
      if (clockFormat === '24h') {
        this.btnClock24h.classList.add('active');
        this.btnClock12h.classList.remove('active');
      } else {
        this.btnClock24h.classList.remove('active');
        this.btnClock12h.classList.add('active');
      }
    }

    // Actualizar botones de tema
    if (this.btnThemeDark && this.btnThemeLight) {
      if (theme === 'dark') {
        this.btnThemeDark.classList.add('active');
        this.btnThemeLight.classList.remove('active');
      } else {
        this.btnThemeDark.classList.remove('active');
        this.btnThemeLight.classList.add('active');
      }
    }
  }

  async handleSaveMesasConfig() {
    const total = parseInt(this.inputTotalMesas.value, 10);
    if (isNaN(total) || total < 1 || total > 100) {
      showToast('Por favor ingrese un número válido entre 1 y 100.', true);
      return;
    }

    try {
      this.btnSaveMesas.disabled = true;
      this.btnSaveMesas.textContent = 'Guardando...';

      const res = await api.setConfigMesas(total);
      store.setMesas(res.mesas);
      showToast(`✓ Aforo configurado a ${res.total} mesas.`);
      this.close();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      if (this.btnSaveMesas) {
        this.btnSaveMesas.disabled = false;
        this.btnSaveMesas.textContent = '💾 Guardar Aforo de Mesas';
      }
    }
  }

  async refreshProducts() {
    try {
      const productos = await api.getProductos(true);
      store.setProductos(productos);
      this.renderProductsList();
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    }
  }

  renderProductsList() {
    if (!this.productsListContainer) return;
    const productos = store.getState().productos || [];

    if (productos.length === 0) {
      this.productsListContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
          No hay productos registrados en el inventario. Agregue uno arriba.
        </div>
      `;
      return;
    }

    this.productsListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    productos.forEach((prod) => {
      const item = document.createElement('div');
      item.className = 'product-list-item';
      const formattedPrice = new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
      }).format(prod.precio);

      item.innerHTML = `
        <div class="prod-item-info">
          <span class="prod-item-name">${prod.nombre}</span>
          <span class="prod-item-meta">
            <span class="prod-category-badge">${prod.categoria || 'General'}</span>
            <strong class="prod-item-price">${formattedPrice}</strong>
          </span>
        </div>
        <div class="prod-item-actions">
          <button type="button" class="btn-delete-prod touch-btn" data-id="${prod.id}" title="Eliminar producto">
            🗑️
          </button>
        </div>
      `;

      // Evento eliminar
      const btnDelete = item.querySelector('.btn-delete-prod');
      btnDelete.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar el producto "${prod.nombre}" del catálogo?`)) {
          try {
            await api.deleteProducto(prod.id);
            store.removeProductoFromStore(prod.id);
            showToast(`Producto "${prod.nombre}" eliminado`);
            this.renderProductsList();
          } catch (err) {
            showToast(`Error al eliminar: ${err.message}`, true);
          }
        }
      });

      fragment.appendChild(item);
    });

    this.productsListContainer.appendChild(fragment);
  }

  async handleAddProduct() {
    const nombre = this.inputProdNombre?.value?.trim();
    const precio = parseFloat(this.inputProdPrecio?.value);
    const categoria = this.selectProdCategoria?.value?.trim() || 'General';

    if (!nombre) {
      showToast('Debe ingresar un nombre para el producto.', true);
      return;
    }

    if (isNaN(precio) || precio < 0) {
      showToast('Debe ingresar un precio válido (mayor o igual a 0).', true);
      return;
    }

    try {
      const nuevo = await api.createProducto({ nombre, precio, categoria });
      store.addProducto(nuevo);
      showToast(`✓ "${nuevo.nombre}" agregado al catálogo.`);

      // Limpiar formulario
      if (this.inputProdNombre) this.inputProdNombre.value = '';
      if (this.inputProdPrecio) this.inputProdPrecio.value = '';

      this.renderProductsList();
    } catch (err) {
      showToast(`Error al crear producto: ${err.message}`, true);
    }
  }
}
