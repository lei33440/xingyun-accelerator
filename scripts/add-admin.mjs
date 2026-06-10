// Add a new Strapi admin user (admin@local / admin1234) without touching
// any account the user has already created.
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';

const db = new Database(path.resolve('cms/.tmp/data.db'));

const email = 'admin@local';
const password = 'admin1234';

// Make sure we don't overwrite anyone
const existing = db.prepare('SELECT id, email FROM admin_users WHERE email = ?').get(email);
if (existing) {
  console.log('Admin already exists:', existing);
  db.close();
  process.exit(0);
}

const superAdminRole = db.prepare("SELECT id FROM admin_roles WHERE code = 'strapi-super-admin'").get();
if (!superAdminRole) {
  console.error('No super-admin role found. Strapi tables not initialized?');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const now = Date.now();

const info = db.prepare(`
  INSERT INTO admin_users
    (firstname, lastname, username, email, password, is_active, blocked, created_at, updated_at)
  VALUES
    (?, ?, ?, ?, ?, 1, 0, ?, ?)
`).run('Local', 'Admin', 'admin', email, passwordHash, now, now);

const userId = info.lastInsertRowid;
db.prepare(`
  INSERT INTO admin_users_roles_links (user_id, role_id, role_order, user_order)
  VALUES (?, ?, 1, 1)
`).run(userId, superAdminRole.id);

console.log('Created admin user id', userId);
console.log('\n=== Login ===');
console.log('URL:      http://127.0.0.1:1337/admin');
console.log('Email:    admin@local');
console.log('Password: admin1234');

db.close();
