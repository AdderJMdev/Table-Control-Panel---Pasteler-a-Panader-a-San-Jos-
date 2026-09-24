import { db } from '../db/database.js';

/**
 * Controlador de Seguridad / Autenticación por PIN
 *
 * - access_pin: clave de 6 dígitos solicitada al abrir la app (se guarda en DB).
 * - MASTER_PIN: clave maestra de recuperación (fija, en código).
 */
const MASTER_PIN = '462663';
const DEFAULT_ACCESS_PIN = '123456';

const REGEX_PIN = /^\d{6}$/;

export const authController = {
  /**
   * Obtiene la clave de acceso actual guardada en la base de datos
   */
  getAccessPin() {
    const row = db.prepare("SELECT valor FROM config_app WHERE clave = 'access_pin'").get();
    return row ? row.valor : DEFAULT_ACCESS_PIN;
  },

  isMasterPin(pin) {
    return typeof pin === 'string' && pin.trim() === MASTER_PIN;
  },

  /**
   * Verifica el PIN de acceso (la clave maestra también concede acceso
   * para recuperar la app si el PIN fue olvidado).
   */
  verify(pin) {
    if (typeof pin !== 'string' || !REGEX_PIN.test(pin.trim())) {
      return false;
    }
    const normalized = pin.trim();
    return normalized === this.getAccessPin() || normalized === MASTER_PIN;
  },

  /**
   * Verifica únicamente la clave maestra (autorización administrativa)
   */
  verifyMaster(masterKey) {
    return this.isMasterPin(masterKey);
  },

  /**
   * Cambia la clave de acceso solicitando la clave maestra como autorización
   */
  changePin({ masterKey, newPin }) {
    if (!this.verifyMaster(masterKey)) {
      throw new Error('Clave maestra incorrecta.');
    }
    if (typeof newPin !== 'string' || !REGEX_PIN.test(newPin.trim())) {
      throw new Error('La nueva clave debe tener exactamente 6 dígitos.');
    }

    const stmt = db.prepare("UPDATE config_app SET valor = ? WHERE clave = 'access_pin'");
    stmt.run(newPin.trim());
    return { success: true };
  }
};