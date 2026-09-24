import { db } from '../db/database.js';

/**
 * Controlador de Configuración General de la App
 *
 * Almacena valores en la tabla clave-valor config_app como JSON.
 */
const DEFAULT_QUICK_AMOUNTS = [10, 20, 50];

const getRaw = () => db.prepare('SELECT valor FROM config_app WHERE clave = ?');
const upsert = () => db.prepare(`
  INSERT INTO config_app (clave, valor) VALUES (?, ?)
  ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
`);

export const configController = {
  /**
   * Obtiene un valor de configuración (parseado como JSON) o el fallback
   */
  get(key, fallback = null) {
    const row = getRaw().get(key);
    if (!row) return fallback;
    try {
      return JSON.parse(row.valor);
    } catch {
      return fallback;
    }
  },

  /**
   * Guarda un valor de configuración serializado como JSON
   */
  set(key, value) {
    upsert().run(key, JSON.stringify(value));
  },

  /**
   * Montos de los botones de acceso rápido (+S/10, +S/20, +S/50)
   */
  getQuickAmounts() {
    const stored = this.get('quick_amounts', null);
    if (Array.isArray(stored) && stored.every((n) => typeof n === 'number')) {
      return stored;
    }
    return [...DEFAULT_QUICK_AMOUNTS];
  },

  /**
   * Valida y actualiza los montos de acceso rápido (1 a 3 montos)
   */
  setQuickAmounts(amounts) {
    if (!Array.isArray(amounts) || amounts.length < 1 || amounts.length > 3) {
      throw new Error('Debe indicar entre 1 y 3 montos.');
    }

    const normalized = amounts.map((m) => {
      const num = Number(m);
      if (isNaN(num) || num < 0 || num > 999) {
        throw new Error('Los montos deben ser números entre 0 y 999.');
      }
      return Math.round(num * 100) / 100;
    });

    // Evitar duplicados que confundan al operador
    if (new Set(normalized).size !== normalized.length) {
      throw new Error('Los montos deben ser diferentes entre sí.');
    }

    this.set('quick_amounts', normalized);
    return normalized;
  }
};