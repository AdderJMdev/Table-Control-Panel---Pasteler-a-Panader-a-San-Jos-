import { db } from '../db/database.js';

export const productosController = {
  /**
   * Obtiene la lista de productos del inventario básico
   */
  getAll({ soloActivos = true } = {}) {
    const query = soloActivos
      ? 'SELECT * FROM productos WHERE activo = 1 ORDER BY categoria ASC, nombre ASC'
      : 'SELECT * FROM productos ORDER BY categoria ASC, nombre ASC';
    const stmt = db.prepare(query);
    return stmt.all();
  },

  /**
   * Obtiene un producto por ID
   */
  getById(id) {
    const stmt = db.prepare('SELECT * FROM productos WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * Agrega un nuevo producto al catálogo
   */
  create({ nombre, precio, categoria = 'General' }) {
    if (!nombre || !nombre.trim()) {
      throw new Error('El nombre del producto es requerido.');
    }
    const numPrecio = Number(precio);
    if (isNaN(numPrecio) || numPrecio < 0) {
      throw new Error('El precio debe ser un número mayor o igual a 0.');
    }

    const stmt = db.prepare(`
      INSERT INTO productos (nombre, precio, categoria, activo)
      VALUES (?, ?, ?, 1)
    `);
    const info = stmt.run(nombre.trim(), numPrecio, (categoria || 'General').trim());
    return this.getById(info.lastInsertRowid);
  },

  /**
   * Actualiza los datos de un producto
   */
  update(id, { nombre, precio, categoria, activo }) {
    const actual = this.getById(id);
    if (!actual) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }

    const nuevoNombre = nombre !== undefined ? String(nombre).trim() : actual.nombre;
    const nuevoPrecio = precio !== undefined ? Number(precio) : actual.precio;
    const nuevaCategoria = categoria !== undefined ? String(categoria).trim() : actual.categoria;
    const nuevoActivo = activo !== undefined ? (activo ? 1 : 0) : actual.activo;

    if (!nuevoNombre) {
      throw new Error('El nombre del producto no puede quedar vacío.');
    }
    if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      throw new Error('El precio debe ser un número válido.');
    }

    const stmt = db.prepare(`
      UPDATE productos
      SET nombre = ?, precio = ?, categoria = ?, activo = ?
      WHERE id = ?
    `);
    stmt.run(nuevoNombre, nuevoPrecio, nuevaCategoria, nuevoActivo, id);
    return this.getById(id);
  },

  /**
   * Elimina un producto por ID
   */
  delete(id) {
    const actual = this.getById(id);
    if (!actual) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }
    const stmt = db.prepare('DELETE FROM productos WHERE id = ?');
    stmt.run(id);
    return { success: true, id, deleted: actual };
  }
};
