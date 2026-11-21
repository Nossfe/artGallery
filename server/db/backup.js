const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { backupDir: defaultBackupDir, backupKeep: defaultKeep } = require('../config/env');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Crea un respaldo consistente en caliente de SQLite (seguro incluso en modo WAL)
 * y conserva únicamente los últimos `keep` archivos en `backupDir`.
 */
async function backupDatabase({
  database = db,
  backupDir = defaultBackupDir,
  keep = defaultKeep,
  filename = `gallery-${timestamp()}.db`,
} = {}) {
  fs.mkdirSync(backupDir, { recursive: true });
  const target = path.join(backupDir, filename);
  await database.backup(target);

  const archivos = fs
    .readdirSync(backupDir)
    .filter((f) => /^gallery-.*\.db$/.test(f))
    .sort()
    .reverse();

  const eliminados = [];
  for (const viejo of archivos.slice(keep)) {
    fs.unlinkSync(path.join(backupDir, viejo));
    eliminados.push(viejo);
  }

  return { target, kept: Math.min(archivos.length, keep), removed: eliminados };
}

module.exports = { backupDatabase };

if (require.main === module) {
  backupDatabase()
    .then(({ target, kept, removed }) => {
      console.log(`Respaldo creado en ${target} (conservados: ${kept}, rotados: ${removed.length})`);
    })
    .catch((err) => {
      console.error('No se pudo crear el respaldo:', err.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
