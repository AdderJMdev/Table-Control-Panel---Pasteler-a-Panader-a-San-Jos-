import { db } from '../db/database.js';

const ESTADOS_VALIDOS = ['LIBRE', 'OCUPADA', 'CUENTA_PEDIDA', 'RESERVADA'];

export const mesasController = {
  /**
   * Obtiene la lista completa de mesas ordenadas por su número identificador (RF-01)
   */
  getAll() {
    const stmt = db.prepare(`
      SELECT 
        id, 
        numero, 
        estado, 
        consumo_estimado, 
        notas, 
        ultima_actualizacion 
      FROM mesas 
      ORDER BY numero ASC
    `);
    return stmt.all();
  },

  /**
   * Obtiene los datos detallados de una mesa por ID
   */
  getById(id) {
    const stmt = db.prepare(`
      SELECT 
        id, 
        numero, 
        estado, 
        consumo_estimado, 
        notas, 
        ultima_actualizacion 
      FROM mesas 
      WHERE id = ?
    `);
    return stmt.get(id);
  },

  /**
   * Actualiza el estado y opcionalmente el consumo estimado / notas de una mesa (RF-04, RF-05, RF-07, RF-08)
   */
  updateEstado(id, { estado, consumo_estimado, notas }) {
    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      throw new Error(`Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    const mesaActual = this.getById(id);
    if (!mesaActual) {
      throw new Error(`Mesa con ID ${id} no encontrada.`);
    }

    // Determinar tipo de acción para auditoría (RF-08)
    let tipoAccion = 'CAMBIO_ESTADO';
    if (mesaActual.estado === 'LIBRE' && estado === 'OCUPADA') {
      tipoAccion = 'APERTURA';
    } else if (estado === 'LIBRE') {
      tipoAccion = 'LIBERACION';
    }

    const nuevoConsumo = (consumo_estimado !== undefined && consumo_estimado !== null) 
      ? Number(consumo_estimado) 
      : mesaActual.consumo_estimado;

    const nuevasNotas = (notas !== undefined && notas !== null)
      ? String(notas).trim()
      : mesaActual.notas;

    // Ejecutar actualización y registro de log dentro de una transacción atómica
    const executeTx = db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE mesas 
        SET 
          estado = ?, 
          consumo_estimado = ?, 
          notas = ?, 
          ultima_actualizacion = datetime('now', 'localtime') 
        WHERE id = ?
      `);
      updateStmt.run(estado, nuevoConsumo, nuevasNotas, id);

      const logStmt = db.prepare(`
        INSERT INTO logs_estados (
          mesa_id, 
          numero_mesa, 
          tipo_accion, 
          estado_anterior, 
          estado_nuevo, 
          consumo_estimado, 
          notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      logStmt.run(
        id, 
        mesaActual.numero, 
        tipoAccion, 
        mesaActual.estado, 
        estado, 
        nuevoConsumo, 
        nuevasNotas
      );

      return this.getById(id);
    });

    return executeTx();
  },

  /**
   * Libera una mesa (RF-06): cambia a LIBRE, reinicia consumo y notas, y registra LIBERACION
   */
  liberar(id) {
    const mesaActual = this.getById(id);
    if (!mesaActual) {
      throw new Error(`Mesa con ID ${id} no encontrada.`);
    }

    const executeTx = db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE mesas 
        SET 
          estado = 'LIBRE', 
          consumo_estimado = 0.00, 
          notas = '', 
          ultima_actualizacion = datetime('now', 'localtime') 
        WHERE id = ?
      `);
      updateStmt.run(id);

      const logStmt = db.prepare(`
        INSERT INTO logs_estados (
          mesa_id, 
          numero_mesa, 
          tipo_accion, 
          estado_anterior, 
          estado_nuevo, 
          consumo_estimado, 
          notas
        ) VALUES (?, ?, 'LIBERACION', ?, 'LIBRE', 0.00, '')
      `);
      logStmt.run(id, mesaActual.numero, mesaActual.estado);

      return this.getById(id);
    });

    return executeTx();
  },

  /**
   * Configura la cantidad total de mesas (Ajustes de Aforo)
   */
  setTableCount(newTotal) {
    const total = parseInt(newTotal, 10);
    if (isNaN(total) || total < 1 || total > 100) {
      throw new Error('El número de mesas debe ser un entero entre 1 y 100.');
    }

    const currentMesas = this.getAll();
    const currentCount = currentMesas.length;

    if (total === currentCount) {
      return currentMesas;
    }

    const executeTx = db.transaction(() => {
      if (total > currentCount) {
        // Agregar nuevas mesas en estado LIBRE
        const maxNumero = currentMesas.reduce((max, m) => Math.max(max, m.numero), 0);
        const insertStmt = db.prepare('INSERT INTO mesas (numero, estado) VALUES (?, ?)');
        for (let i = 1; i <= (total - currentCount); i++) {
          insertStmt.run(maxNumero + i, 'LIBRE');
        }
      } else {
        // Reducir mesas: verificar que las mesas a eliminar no tengan clientes activos
        const mesasAEliminar = currentMesas.slice(total);
        const ocupadas = mesasAEliminar.filter((m) => m.estado !== 'LIBRE');
        if (ocupadas.length > 0) {
          const detalle = ocupadas.map((m) => `Mesa ${m.numero} (${m.estado})`).join(', ');
          throw new Error(`No se puede reducir a ${total} mesas: ${detalle} tienen órdenes activas. Libérelas antes de reducir el aforo.`);
        }

        const deleteStmt = db.prepare('DELETE FROM mesas WHERE id = ?');
        for (const m of mesasAEliminar) {
          deleteStmt.run(m.id);
        }
      }

      return this.getAll();
    });

    return executeTx();
  }
};
