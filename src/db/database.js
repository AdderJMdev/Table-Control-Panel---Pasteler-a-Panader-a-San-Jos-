import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar conexión a la base de datos local SQLite
export const db = new Database(config.dbPath, {
  // verbose: console.log
});

// Pragmas de rendimiento y consistencia local (RNF-06, RNF-07)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

/**
 * Inicializa el esquema y datos iniciales si no existen (RF-09)
 */
export function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // 1. Verificar si ya existen mesas configuradas
  const countMesasStmt = db.prepare('SELECT COUNT(*) as count FROM mesas');
  const { count: countMesas } = countMesasStmt.get();

  if (countMesas === 0) {
    const insertMesa = db.prepare('INSERT INTO mesas (numero, estado) VALUES (?, ?)');
    const insertManyMesas = db.transaction((total) => {
      for (let i = 1; i <= total; i++) {
        insertMesa.run(i, 'LIBRE');
      }
    });

    insertManyMesas(config.totalDefaultMesas);
    console.log(`[DB] Inicializadas ${config.totalDefaultMesas} mesas predeterminadas en estado LIBRE.`);
  } else {
    console.log(`[DB] Base de datos lista con ${countMesas} mesas.`);
  }

  // 2. Verificar si ya existen productos en el inventario básico
  const countProdStmt = db.prepare('SELECT COUNT(*) as count FROM productos');
  const { count: countProd } = countProdStmt.get();

  if (countProd === 0) {
    const defaultProductos = [
      { nombre: 'Café Americano', precio: 8.00, categoria: 'Bebidas Calientes' },
      { nombre: 'Capuchino', precio: 12.00, categoria: 'Bebidas Calientes' },
      { nombre: 'Latte Vainilla', precio: 13.50, categoria: 'Bebidas Calientes' },
      { nombre: 'Té / Infusión', precio: 6.50, categoria: 'Bebidas Calientes' },
      { nombre: 'Jugo Natural de Naranja', precio: 10.00, categoria: 'Bebidas Frías' },
      { nombre: 'Gaseosa / Agua', precio: 5.00, categoria: 'Bebidas Frías' },
      { nombre: 'Croissant Clásico', precio: 8.50, categoria: 'Pastelería' },
      { nombre: 'Tarta de Fresa Especial', precio: 15.00, categoria: 'Pastelería' },
      { nombre: 'Porción Torta Chocolate', precio: 14.00, categoria: 'Pastelería' },
      { nombre: 'Muffin de Arándanos', precio: 7.50, categoria: 'Pastelería' },
      { nombre: 'Empanada de Carne', precio: 9.00, categoria: 'Salados' },
      { nombre: 'Sándwich Mixto Caliente', precio: 11.50, categoria: 'Salados' }
    ];

    const insertProd = db.prepare(
      'INSERT INTO productos (nombre, precio, categoria, activo) VALUES (?, ?, ?, 1)'
    );
    const insertManyProd = db.transaction((items) => {
      for (const p of items) {
        insertProd.run(p.nombre, p.precio, p.categoria);
      }
    });

    insertManyProd(defaultProductos);
    console.log(`[DB] Inicializados ${defaultProductos.length} productos predeterminados en el catálogo.`);
  } else {
    console.log(`[DB] Catálogo listo con ${countProd} productos.`);
  }

  // 3. Verificar clave de acceso por defecto (seguridad PIN)
  const insertPin = db.prepare(
    "INSERT OR IGNORE INTO config_app (clave, valor) VALUES ('access_pin', '123456')"
  );
  insertPin.run();
}
