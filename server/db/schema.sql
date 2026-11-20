CREATE TABLE IF NOT EXISTS admin (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS artworks (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre           TEXT NOT NULL,
  precio           INTEGER NOT NULL CHECK (precio > 0),
  ancho_cm         REAL,
  alto_cm          REAL,
  profundidad_cm   REAL,
  estilo_tecnica   TEXT,
  imagen_url       TEXT,
  imagen_public_id TEXT,
  vendida          INTEGER NOT NULL DEFAULT 0 CHECK (vendida IN (0, 1)),
  descripcion      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_artworks_vendida ON artworks (vendida);
CREATE INDEX IF NOT EXISTS idx_artworks_estilo ON artworks (estilo_tecnica);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
