/**
 * Cliente API REST para comunicación con el backend local (RNF-04, RNF-07)
 */
export const api = {
  baseUrl: '/api',

  /**
   * Petición genérica con medición de latencia y control de errores
   */
  async request(endpoint, options = {}) {
    const t0 = performance.now();
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });

      const data = await response.json();
      const t1 = performance.now();
      const latencyMs = Math.round(t1 - t0);

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}`);
      }

      // Registro de latencia para verificar RNF-07 (< 100ms)
      if (latencyMs > 100) {
        console.warn(`[API Latencia] ${options.method || 'GET'} ${endpoint} tardó ${latencyMs}ms (>100ms)`);
      }

      return data.data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  },

  // ==========================================
  // MESAS
  // ==========================================

  /**
   * Obtiene la lista completa de mesas (RF-01, RF-03)
   */
  async getMesas() {
    return this.request('/mesas');
  },

  /**
   * Obtiene los datos de una mesa específica
   */
  async getMesa(id) {
    return this.request(`/mesas/${id}`);
  },

  /**
   * Actualiza el estado y opcionalmente consumo/notas (RF-04, RF-05, RF-07)
   */
  async updateEstado(id, { estado, consumo_estimado, notas }) {
    return this.request(`/mesas/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado, consumo_estimado, notas })
    });
  },

  /**
   * Libera una mesa (RF-06)
   */
  async liberarMesa(id) {
    return this.request(`/mesas/${id}/liberar`, {
      method: 'POST'
    });
  },

  // ==========================================
  // CONFIGURACIÓN DE MESAS (AJUSTES)
  // ==========================================

  /**
   * Obtiene la configuración de cantidad de mesas
   */
  async getConfigMesas() {
    return this.request('/config/mesas');
  },

  /**
   * Ajusta la cantidad total de mesas del local
   */
  async setConfigMesas(total) {
    return this.request('/config/mesas', {
      method: 'PUT',
      body: JSON.stringify({ total })
    });
  },

  // ==========================================
  // INVENTARIO DE PRODUCTOS BÁSICOS
  // ==========================================

  /**
   * Obtiene la lista de productos
   */
  async getProductos(todos = false) {
    return this.request(`/productos${todos ? '?todos=1' : ''}`);
  },

  /**
   * Crea un nuevo producto
   */
  async createProducto({ nombre, precio, categoria }) {
    return this.request('/productos', {
      method: 'POST',
      body: JSON.stringify({ nombre, precio, categoria })
    });
  },

  /**
   * Actualiza un producto existente
   */
  async updateProducto(id, data) {
    return this.request(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Elimina un producto del catálogo
   */
  async deleteProducto(id) {
    return this.request(`/productos/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // AUDITORÍA
  // ==========================================

  /**
   * Obtiene los últimos logs de auditoría (RF-08)
   */
  async getLogs(limit = 30) {
    return this.request(`/logs?limit=${limit}`);
  }
};
