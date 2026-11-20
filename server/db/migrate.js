const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { dbPath } = require('../config/env');

function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

module.exports = { migrate };

if (require.main === module) {
  migrate();
  const tablas = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((t) => t.name);

  console.log(`Migración completada en ${dbPath}`);
  console.log(`Tablas: ${tablas.join(', ')}`);
  db.close();
}
