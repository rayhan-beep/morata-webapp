const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'), (err) => {
  if (err) { console.error('DB Error:', err.message); return; }
  console.log('Connected to SQLite.');
  init();
});

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','sales','manager')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      media_code TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Billboard','LED','Static')),
      location TEXT,
      city TEXT NOT NULL,
      rate_card REAL DEFAULT 0,
      net_price REAL NOT NULL,
      super_net_price REAL NOT NULL,
      photo_url TEXT,
      specs TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      proposal_id TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      proposal_number TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      client_company TEXT,
      client_email TEXT,
      client_phone TEXT,
      campaign_name TEXT NOT NULL,
      sales_id TEXT NOT NULL,
      manager_id TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','waiting_approval','approved','rejected','published')),
      manager_notes TEXT,
      pdf_url TEXT,
      total_amount REAL DEFAULT 0,
      submitted_at DATETIME,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS proposal_items (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      duration_days INTEGER,
      price_type TEXT NOT NULL CHECK(price_type IN ('rate_card','net','super_net','custom')),
      standard_price REAL NOT NULL,
      proposed_price REAL NOT NULL,
      price_difference REAL DEFAULT 0,
      price_difference_pct REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Tables initialized.');
  });
}

module.exports = db;
