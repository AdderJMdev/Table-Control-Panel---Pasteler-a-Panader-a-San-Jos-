import { db } from '../db/database.js';

export const logsController = {
  /**
   * Obtiene el historial de eventos de auditoría (RF-08)
   */
  getRecentLogs(limit = 50) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const stmt = db.prepare(`
      SELECT 
        id, 
        mesa_id, 
        numero_mesa, 
        tipo_accion, 
        estado_anterior, 
        estado_nuevo, 
        consumo_estimado, 
        notas, 
        timestamp 
      FROM logs_estados 
      ORDER BY id DESC 
      LIMIT ?
    `);
    return stmt.all(safeLimit);
  },

  /**
   * Obtiene el historial de una mesa específica
   */
  getByMesaId(mesaId, limit = 20) {
    const stmt = db.prepare(`
      SELECT 
        id, 
        mesa_id, 
        numero_mesa, 
        tipo_accion, 
        estado_anterior, 
        estado_nuevo, 
        consumo_estimado, 
        notas, 
        timestamp 
      FROM logs_estados 
      WHERE mesa_id = ? 
      ORDER BY id DESC 
      LIMIT ?
    `);
    return stmt.all(mesaId, limit);
  }
};
