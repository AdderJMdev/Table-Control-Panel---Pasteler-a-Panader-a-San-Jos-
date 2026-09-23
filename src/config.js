import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  dbPath: path.resolve(__dirname, '../san_jose.db'),
  publicDir: path.resolve(__dirname, '../public'),
  totalDefaultMesas: 16
};
