require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const clerkUserId = process.env.DEV_TEST_USER_ID || 'user_3DSoZz9M37XMh3MPSCCyVAOfe7v';

  const sql = `INSERT INTO user_role (clerk_user_id, role, id_vendedor, nombre_empresa)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET role = EXCLUDED.role,
          id_vendedor = EXCLUDED.id_vendedor,
          nombre_empresa = EXCLUDED.nombre_empresa
    RETURNING *;
  `;

  try {
    const res = await pool.query(sql, [clerkUserId, 'logistic_admin', 999, 'AGUASNEARDAS']);
    console.log('Upsert result:', res.rows[0]);
  } catch (err) {
    console.error('Error executing upsert:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
