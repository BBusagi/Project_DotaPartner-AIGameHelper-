CREATE TABLE IF NOT EXISTS heroes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  localized_name TEXT NOT NULL,
  primary_attr TEXT,
  attack_type TEXT,
  roles_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS steam_identity_map (
  steam_id64 TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  resolved_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS stat_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  patch TEXT NOT NULL,
  window_start DATETIME NOT NULL,
  window_end DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hero_matchups (
  stat_window_id INTEGER NOT NULL,
  hero_id INTEGER NOT NULL,
  against_hero_id INTEGER NOT NULL,
  win_rate REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  confidence REAL NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id, against_hero_id)
);

CREATE TABLE IF NOT EXISTS hero_synergies (
  stat_window_id INTEGER NOT NULL,
  hero_id_1 INTEGER NOT NULL,
  hero_id_2 INTEGER NOT NULL,
  combined_win_rate REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  confidence REAL NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id_1, hero_id_2)
);

CREATE TABLE IF NOT EXISTS hero_duration_curves (
  stat_window_id INTEGER NOT NULL,
  hero_id INTEGER NOT NULL,
  minute_bucket INTEGER NOT NULL,
  win_rate REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id, minute_bucket)
);

CREATE TABLE IF NOT EXISTS meta_stats (
  stat_window_id INTEGER NOT NULL,
  hero_id INTEGER NOT NULL,
  pick_rate REAL NOT NULL,
  ban_rate REAL NOT NULL,
  win_rate REAL NOT NULL,
  win_rate_prev_week REAL,
  trending TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id)
);

CREATE TABLE IF NOT EXISTS player_cache (
  steam_id64 TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  profile_json TEXT NOT NULL,
  hero_pool_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_samples (
  match_id BIGINT PRIMARY KEY,
  patch TEXT,
  avg_rank_tier INTEGER,
  duration INTEGER,
  radiant_win BOOLEAN,
  radiant_heroes_json TEXT NOT NULL,
  dire_heroes_json TEXT NOT NULL,
  match_json TEXT NOT NULL,
  start_time DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advice_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  match_id TEXT,
  game_time INTEGER,
  advice_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

