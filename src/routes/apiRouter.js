import { mesasController } from '../controllers/mesasController.js';
import { logsController } from '../controllers/logsController.js';
import { productosController } from '../controllers/productosController.js';
import { authController } from '../controllers/authController.js';
import { configController } from '../controllers/configController.js';
import { realtime } from '../realtime.js';

/**
 * Helper para parsear JSON de la petición HTTP nativa
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Protección contra payloads excesivos (máximo 1MB)
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload demasiado grande.'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('JSON inválido en el cuerpo de la petición.'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

/**
 * Envía una respuesta JSON con código de estado y encabezados adecuados
 */
export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  res.end(JSON.stringify(data));
}

/**
 * Enrutador principal de endpoints de API (/api/...)
 */
export async function handleApiRequest(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method;

  try {
    // ==========================================
    // MÓDULO DE MESAS (RF-01 a RF-06)
    // ==========================================

    // GET /api/mesas -> Listado de mesas (RF-01, RF-03)
    if (method === 'GET' && pathname === '/api/mesas') {
      const mesas = mesasController.getAll();
      return sendJson(res, 200, { success: true, data: mesas });
    }

    // GET /api/mesas/:id
    const mesaIdMatch = pathname.match(/^\/api\/mesas\/(\d+)$/);
    if (method === 'GET' && mesaIdMatch) {
      const id = parseInt(mesaIdMatch[1], 10);
      const mesa = mesasController.getById(id);
      if (!mesa) {
        return sendJson(res, 404, { success: false, error: 'Mesa no encontrada.' });
      }
      return sendJson(res, 200, { success: true, data: mesa });
    }

    // PUT /api/mesas/:id/estado -> Actualización de estado y consumo (RF-04, RF-05, RF-07, RF-08)
    const estadoMatch = pathname.match(/^\/api\/mesas\/(\d+)\/estado$/);
    if (method === 'PUT' && estadoMatch) {
      const id = parseInt(estadoMatch[1], 10);
      const body = await parseJsonBody(req);
      const updated = mesasController.updateEstado(id, body);
      realtime.broadcast({ type: 'mesas:updated', data: updated });
      return sendJson(res, 200, {
        success: true,
        message: `Mesa ${updated.numero} actualizada a estado ${updated.estado}.`,
        data: updated
      });
    }

    // POST /api/mesas/:id/liberar -> Liberación directa de mesa (RF-06, RF-08)
    const liberarMatch = pathname.match(/^\/api\/mesas\/(\d+)\/liberar$/);
    if (method === 'POST' && liberarMatch) {
      const id = parseInt(liberarMatch[1], 10);
      const updated = mesasController.liberar(id);
      realtime.broadcast({ type: 'mesas:updated', data: updated });
      return sendJson(res, 200, {
        success: true,
        message: `Mesa ${updated.numero} liberada con éxito.`,
        data: updated
      });
    }

    // GET /api/mesas/:id/logs -> Auditoría específica de una mesa
    const mesaLogsMatch = pathname.match(/^\/api\/mesas\/(\d+)\/logs$/);
    if (method === 'GET' && mesaLogsMatch) {
      const id = parseInt(mesaLogsMatch[1], 10);
      const limit = searchParams.get('limit') || 20;
      const logs = logsController.getByMesaId(id, limit);
      return sendJson(res, 200, { success: true, data: logs });
    }

    // ==========================================
    // MÓDULO DE AJUSTES Y CONFIGURACIÓN DE MESAS
    // ==========================================

    // GET /api/config/mesas -> Obtiene configuración actual de mesas
    if (method === 'GET' && pathname === '/api/config/mesas') {
      const mesas = mesasController.getAll();
      return sendJson(res, 200, {
        success: true,
        data: {
          total: mesas.length,
          mesas
        }
      });
    }

    // PUT /api/config/mesas -> Configura y ajusta la cantidad total de mesas
    if (method === 'PUT' && pathname === '/api/config/mesas') {
      const body = await parseJsonBody(req);
      const updatedMesas = mesasController.setTableCount(body.total);
      realtime.broadcast({ type: 'mesas:set', data: updatedMesas });
      return sendJson(res, 200, {
        success: true,
        message: `Aforo actualizado exitosamente a ${updatedMesas.length} mesas.`,
        data: {
          total: updatedMesas.length,
          mesas: updatedMesas
        }
      });
    }

    // ==========================================
    // MÓDULO DE PRODUCTOS / CATÁLOGO RÁPIDO
    // ==========================================

    // GET /api/productos -> Lista de productos (por defecto solo activos)
    if (method === 'GET' && pathname === '/api/productos') {
      const todos = searchParams.get('todos') === '1' || searchParams.get('todos') === 'true';
      const productos = productosController.getAll({ soloActivos: !todos });
      return sendJson(res, 200, { success: true, data: productos });
    }

    // GET /api/productos/:id
    const prodIdMatch = pathname.match(/^\/api\/productos\/(\d+)$/);
    if (method === 'GET' && prodIdMatch) {
      const id = parseInt(prodIdMatch[1], 10);
      const prod = productosController.getById(id);
      if (!prod) {
        return sendJson(res, 404, { success: false, error: 'Producto no encontrado.' });
      }
      return sendJson(res, 200, { success: true, data: prod });
    }

    // POST /api/productos -> Crear producto nuevo
    if (method === 'POST' && pathname === '/api/productos') {
      const body = await parseJsonBody(req);
      const nuevo = productosController.create(body);
      realtime.broadcast({ type: 'productos:updated', data: { action: 'create', producto: nuevo } });
      return sendJson(res, 201, {
        success: true,
        message: `Producto "${nuevo.nombre}" creado exitosamente.`,
        data: nuevo
      });
    }

    // PUT /api/productos/:id -> Actualizar producto existente
    if (method === 'PUT' && prodIdMatch) {
      const id = parseInt(prodIdMatch[1], 10);
      const body = await parseJsonBody(req);
      const updated = productosController.update(id, body);
      realtime.broadcast({ type: 'productos:updated', data: { action: 'update', producto: updated } });
      return sendJson(res, 200, {
        success: true,
        message: `Producto "${updated.nombre}" actualizado exitosamente.`,
        data: updated
      });
    }

    // DELETE /api/productos/:id -> Eliminar producto
    if (method === 'DELETE' && prodIdMatch) {
      const id = parseInt(prodIdMatch[1], 10);
      const resDelete = productosController.delete(id);
      realtime.broadcast({ type: 'productos:updated', data: { action: 'delete', producto: resDelete.deleted } });
      return sendJson(res, 200, {
        success: true,
        message: `Producto eliminado exitosamente.`,
        data: resDelete
      });
    }

    // ==========================================
    // MÓDULO DE AUDITORÍA (RF-08)
    // ==========================================

    // GET /api/logs -> Historial global de auditoría (RF-08)
    if (method === 'GET' && pathname === '/api/logs') {
      const limit = searchParams.get('limit') || 50;
      const logs = logsController.getRecentLogs(limit);
      return sendJson(res, 200, { success: true, data: logs });
    }

    // ==========================================
    // MÓDULO DE SEGURIDAD (ACCESO POR PIN)
    // ==========================================

    // POST /api/auth/pin -> Verifica el PIN de acceso/desbloqueo de la app.
    // Acepta la clave maestra en el mismo campo para recuperar el acceso.
    if (method === 'POST' && pathname === '/api/auth/pin') {
      const body = await parseJsonBody(req);
      if (authController.verify(body.pin)) {
        return sendJson(res, 200, { success: true, data: true });
      }
      return sendJson(res, 401, { success: false, error: 'PIN incorrecto.' });
    }

    // POST /api/auth/master -> Autentica con la clave maestra (autorización admin)
    if (method === 'POST' && pathname === '/api/auth/master') {
      const body = await parseJsonBody(req);
      if (authController.verifyMaster(body.masterKey)) {
        return sendJson(res, 200, { success: true, data: true });
      }
      return sendJson(res, 401, { success: false, error: 'Clave maestra incorrecta.' });
    }

    // PUT /api/auth/pin -> Cambia la clave de acceso autenticando con la clave maestra
    if (method === 'PUT' && pathname === '/api/auth/pin') {
      const body = await parseJsonBody(req);
      const result = authController.changePin(body);
      return sendJson(res, 200, {
        success: true,
        message: 'Clave de acceso actualizada correctamente.',
        data: result
      });
    }

    // ==========================================
    // MÓDULO DE ACCESOS RÁPIDOS (MONTOS RÁPIDOS)
    // ==========================================

    // GET /api/config/quick-amounts -> Montos de los botones + rápidos
    if (method === 'GET' && pathname === '/api/config/quick-amounts') {
      const amounts = configController.getQuickAmounts();
      return sendJson(res, 200, { success: true, data: amounts });
    }

    // PUT /api/config/quick-amounts -> Actualiza los montos rápidos
    if (method === 'PUT' && pathname === '/api/config/quick-amounts') {
      const body = await parseJsonBody(req);
      const amounts = configController.setQuickAmounts(body.amounts);
      realtime.broadcast({ type: 'quick-amounts:set', data: amounts });
      return sendJson(res, 200, {
        success: true,
        message: 'Montos de acceso rápido actualizados correctamente.',
        data: amounts
      });
    }

    // Si no coincide ninguna ruta /api
    return sendJson(res, 404, { success: false, error: `Ruta de API no encontrada: ${pathname}` });
  } catch (error) {
    console.error(`[API Error] ${method} ${pathname}:`, error.message);
    return sendJson(res, 400, { success: false, error: error.message });
  }
}
