// Clean up duplicate pricing plans from prior failed seed runs
import Database from 'better-sqlite3';
import path from 'node:path';

const db = new Database(path.resolve('cms/.tmp/data.db'));
const rows = db.prepare('SELECT id, name FROM pricing_plans ORDER BY id').all();
console.log('Before:', rows);

// Keep the last (highest id) of each name, delete the rest
const groups = {};
for (const r of rows) {
  if (!groups[r.name]) groups[r.name] = [];
  groups[r.name].push(r.id);
}
let totalDeleted = 0;
for (const [name, ids] of Object.entries(groups)) {
  if (ids.length > 1) {
    const toDelete = ids.slice(0, -1);
    const r = db.prepare(`DELETE FROM pricing_plans WHERE id IN (${toDelete.join(',')})`).run();
    console.log(`  Deleted ${toDelete.length} dup(s) of "${name}" (kept id ${ids[ids.length - 1]})`);
    totalDeleted += r.changes;
  }
}
console.log('Total deleted:', totalDeleted);
const after = db.prepare('SELECT id, name FROM pricing_plans ORDER BY id').all();
console.log('After:', after);
db.close();
