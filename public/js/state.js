/**
 * Gestor de Estado Local Reactivo en Memoria (RNF-04)
 */
class StateManager {
  constructor() {
    const savedFormat = localStorage.getItem('san_jose_clock_format') || '24h';
    const savedTheme = localStorage.getItem('san_jose_theme') || 'dark';

    // Aplicar tema guardado al cargar
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    this.state = {
      mesas: [],
      productos: [],
      selectedMesa: null,
      filter: 'TODAS', // TODAS, LIBRE, OCUPADA, CUENTA_PEDIDA, RESERVADA
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastUpdated: null,
      loading: false,
      clockFormat: savedFormat, // '24h' o '12h'
      theme: savedTheme         // 'dark' o 'light'
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[State Error] Error en suscriptor:', err);
      }
    }
  }

  // Helpers de Mesas
  setMesas(mesas) {
    this.setState({
      mesas,
      lastUpdated: new Date()
    });
  }

  updateSingleMesa(updatedMesa) {
    const mesas = this.state.mesas.map((m) =>
      m.id === updatedMesa.id ? updatedMesa : m
    );
    const selectedMesa = this.state.selectedMesa?.id === updatedMesa.id
      ? updatedMesa
      : this.state.selectedMesa;

    this.setState({
      mesas,
      selectedMesa,
      lastUpdated: new Date()
    });
  }

  setSelectedMesa(mesa) {
    this.setState({ selectedMesa: mesa });
  }

  // Helpers de Productos
  setProductos(productos) {
    this.setState({ productos });
  }

  addProducto(producto) {
    this.setState({
      productos: [...this.state.productos, producto]
    });
  }

  updateProductoInStore(updated) {
    const productos = this.state.productos.map((p) =>
      p.id === updated.id ? updated : p
    );
    this.setState({ productos });
  }

  removeProductoFromStore(id) {
    const productos = this.state.productos.filter((p) => p.id !== id);
    this.setState({ productos });
  }

  // Helpers de Sistema (Reloj y Tema)
  setClockFormat(clockFormat) {
    localStorage.setItem('san_jose_clock_format', clockFormat);
    this.setState({ clockFormat });
  }

  setTheme(theme) {
    localStorage.setItem('san_jose_theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.setState({ theme });
  }

  setFilter(filter) {
    this.setState({ filter });
  }

  setOnline(isOnline) {
    this.setState({ isOnline });
  }

  setLoading(loading) {
    this.setState({ loading });
  }
}

export const store = new StateManager();
