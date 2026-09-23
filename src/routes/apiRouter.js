import { mesasController } from '../controllers/mesasController.js';
import { logsController } from '../controllers/logsController.js';
import { productosController } from '../controllers/productosController.js';

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

    // Si no coincide ninguna ruta /api
    return sendJson(res, 404, { success: false, error: `Ruta de API no encontrada: ${pathname}` });
  } catch (error) {
    console.error(`[API Error] ${method} ${pathname}:`, error.message);
    return sendJson(res, 400, { success: false, error: error.message });
  }
}
