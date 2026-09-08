import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log(`Reading schema from ${schemaPath}...`);
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing PostgreSQL database schema...');
    await pool.query(schemaSql);

    console.log('Ensuring workers table has contractor_id column...');
    await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS contractor_id INT REFERENCES users(id) ON DELETE CASCADE;');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_workers_contractor ON workers(contractor_id);');
    console.log('Database schema successfully initialized!');
  } catch (error) {
    console.error('Failed to initialize database schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
