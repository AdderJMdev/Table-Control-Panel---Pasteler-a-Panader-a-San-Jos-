import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Raíz de la aplicación: carpeta que contiene src/ (y public/, san_jose.db)
export const appRoot = path.resolve(__dirname, '..');

const DEFAULT_CONFIG = {
  port: 3000,
  host: '0.0.0.0',
  autoOpenBrowser: false,
  totalDefaultMesas: 16,
  dbPath: path.join(appRoot, 'san_jose.db'),
  publicDir: path.join(appRoot, 'public')
};

/**
 * Configuración portable: si existe config.local.json junto a la aplicación,
 * se usa como override local (p. ej. cambiar el puerto sin tocar el código).
 */
function loadLocalConfig() {
  const localPath = path.join(appRoot, 'config.local.json');
  try {
    if (fs.existsSync(localPath)) {
      const parsed = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null) {
        console.log(`[Config] Usando configuración local: ${localPath}`);
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[Config] No se pudo leer ${localPath}:`, err.message);
  }
  return {};
}

const local = loadLocalConfig();

function resolvePath(value, fallback) {
  return value ? path.resolve(appRoot, value) : fallback;
}

export const config = {
  port: Number(process.env.PORT ?? local.port ?? DEFAULT_CONFIG.port),
  host: process.env.HOST ?? local.host ?? DEFAULT_CONFIG.host,
  // SANJOSE_OPEN_BROWSER=1 fuerza abrir el navegador (primer arranque de instalación)
  autoOpenBrowser: process.env.SANJOSE_OPEN_BROWSER === '1'
    ? true
    : local.autoOpenBrowser ?? DEFAULT_CONFIG.autoOpenBrowser,
  totalDefaultMesas: local.totalDefaultMesas ?? DEFAULT_CONFIG.totalDefaultMesas,
  dbPath: resolvePath(local.dbPath, DEFAULT_CONFIG.dbPath),
  publicDir: DEFAULT_CONFIG.publicDir,
  appRoot
};