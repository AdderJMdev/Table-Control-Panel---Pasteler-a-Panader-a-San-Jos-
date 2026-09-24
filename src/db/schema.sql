-- Tabla de Mesas (RF-01, RF-02, RF-09)
CREATE TABLE IF NOT EXISTS mesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER UNIQUE NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('LIBRE', 'OCUPADA', 'CUENTA_PEDIDA', 'RESERVADA')) DEFAULT 'LIBRE',
    consumo_estimado REAL DEFAULT 0.00,
    notas TEXT DEFAULT '',
    ultima_actualizacion DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de Auditoría / Logs de Estados (RF-08)
CREATE TABLE IF NOT EXISTS logs_estados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mesa_id INTEGER NOT NULL,
    numero_mesa INTEGER NOT NULL,
    tipo_accion TEXT NOT NULL CHECK(tipo_accion IN ('APERTURA', 'CAMBIO_ESTADO', 'LIBERACION')),
    estado_anterior TEXT,
    estado_nuevo TEXT NOT NULL,
    consumo_estimado REAL,
    notas TEXT,
    timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(mesa_id) REFERENCES mesas(id) ON DELETE CASCADE
);

-- Tabla de Inventario / Catálogo de Productos Básicos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL CHECK(precio >= 0),
    categoria TEXT DEFAULT 'General',
    activo INTEGER NOT NULL DEFAULT 1,
    orden INTEGER DEFAULT 0
);

-- Índices para optimización de consultas (<100ms)
CREATE INDEX IF NOT EXISTS idx_mesas_estado ON mesas(estado);
CREATE INDEX IF NOT EXISTS idx_logs_mesa_id ON logs_estados(mesa_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs_estados(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);

-- Tabla de Configuración de la Aplicación (seguridad/PIN)
CREATE TABLE IF NOT EXISTS config_app (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);
