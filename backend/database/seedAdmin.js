import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'System Admin';
  const email = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required to seed an admin.');
    process.exit(1);
  }

  try {
    const existingAdminQuery = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);

    if (existingAdminQuery.rows.length > 0) {
      console.log(`Admin account (${email}) already exists.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    console.log('Admin user successfully seeded:');
    console.log(result.rows[0]);
  } catch (error) {
    console.error('Failed to seed admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
