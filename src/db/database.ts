import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

export interface DatabaseContext {
  db: Database.Database;
  dbPath: string;
}

let databaseContext: DatabaseContext | null = null;

function ensureDirectoryExists(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadSchemaSql(): string {
  const schemaPath = path.resolve(__dirname, '..', '..', 'src', 'db', 'schema.sql');
  return fs.readFileSync(schemaPath, 'utf8');
}

function applyPragmas(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

function applySchema(db: Database.Database): void {
  const schemaSql = loadSchemaSql();
  db.exec(schemaSql);
}

export function initializeDatabase(baseDir: string): DatabaseContext {
  if (databaseContext) {
    return databaseContext;
  }

  ensureDirectoryExists(baseDir);

  const dbPath = path.join(baseDir, 'dotapartner.sqlite');
  const db = new Database(dbPath);

  applyPragmas(db);
  applySchema(db);

  databaseContext = {
    db,
    dbPath
  };

  return databaseContext;
}

export function getDatabase(): DatabaseContext {
  if (!databaseContext) {
    throw new Error('Database has not been initialized yet.');
  }

  return databaseContext;
}

export function closeDatabase(): void {
  if (!databaseContext) {
    return;
  }

  databaseContext.db.close();
  databaseContext = null;
}
