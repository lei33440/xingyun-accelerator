// Create a Strapi admin user directly in SQLite.
// Bypasses the registration UI so we don't need to know the password you picked.
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';

const DB_PATH = 'C:\\Users\\User\\Desktop\\Lightweight Web Architecture\\cms\\.tmp\\data.db';

const email = 'admin@local';
const password = 'admin1234';
const firstname = 'Local';
const lastname = 'Admin';

const db = new Database(DB_PATH);

// Reset email column if it was stored as a blob in older Strapi
const cols = db.prepare("PRAGMA table_info(up_users)").all();
const emailCol = cols.find((c) => c.name === 'email');
console.log('email column type:', emailCol?.type);

const passwordHash = await bcrypt.hash(password, 10);
const resetPasswordToken = crypto.randomBytes(32).toString('hex');
const now = new Date().toISOString();

// Strapi v4 requires a `roles` row in up_roles. Pick the first super-admin role.
// If not present, this is a fresh install and we'll just create a single one.
let role = db.prepare("SELECT id FROM up_roles WHERE code = 'strapi-super-admin' LIMIT 1").get();
if (!role) {
  role = db.prepare("SELECT id FROM up_roles LIMIT 1").get();
}
if (!role) {
  console.error('No role found. Did Strapi ever start? Tables might be empty.');
  process.exit(1);
}
console.log('Using role id:', role.id);

// Delete any previous user with the same email so we can re-run safely
db.prepare('DELETE FROM up_users WHERE email = ?').run(email);

// Strapi stores email as BLOB in some schemas — cast through X'' to be safe.
// We'll use bind parameters; better-sqlite3 will store as TEXT if column is TEXT.
const info = db.prepare(`
  INSERT INTO up_users
    (firstname, lastname, username, email, password, resetPasswordToken, registrationToken, isActive, blocked, createdAt, updatedAt, role)
  VALUES
    (?, ?, ?, ?, ?, ?, NULL, 1, 0, ?, ?, ?)
`).run(firstname, lastname, email, email, passwordHash, resetPasswordToken, now, now, role.id);

console.log('Inserted user id:', info.lastInsertRowid);

const row = db.prepare('SELECT id, email, firstname, lastname, isActive, role FROM up_users WHERE email = ?').get(email);
console.log('Verify:', row);

db.close();
console.log('\n=== Login credentials ===');
console.log('Email:    ', email);
console.log('Password: ', password);
console.log('URL:      ', 'http://127.0.0.1:1337/admin');
