const bcrypt = require('bcrypt');
const { z } = require('zod');
const db = require('../config/db');
const { adminEmail, adminPassword } = require('../config/env');
const { migrate } = require('./migrate');

const BCRYPT_ROUNDS = 12;

const credenciales = z.object({
  email: z.string().email('ADMIN_EMAIL no es un correo válido'),
  password: z.string().min(12, 'ADMIN_PASSWORD debe tener al menos 12 caracteres'),
});

async function main() {
  const parsed = credenciales.safeParse({ email: adminEmail, password: adminPassword });
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => console.error(`Error: ${i.message}`));
    process.exitCode = 1;
    return;
  }

  migrate();
  const hash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

  // Una sola cuenta de administrador: se reemplaza cualquier otra existente.
  const guardar = db.transaction((email, passwordHash) => {
    db.prepare('DELETE FROM admin WHERE email <> ?').run(email);
    const existe = db.prepare('SELECT id FROM admin WHERE email = ?').get(email);
    if (existe) {
      db.prepare('UPDATE admin SET password_hash = ? WHERE id = ?').run(passwordHash, existe.id);
      return 'actualizado';
    }
    db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
    return 'creado';
  });

  const resultado = guardar(parsed.data.email, hash);
  console.log(`Administrador ${resultado}: ${parsed.data.email}`);
}

main()
  .catch((err) => {
    console.error('No se pudo crear el administrador:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
