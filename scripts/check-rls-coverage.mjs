#!/usr/bin/env node
/**
 * Static RLS coverage gate.
 *
 * Reads every migration in supabase/migrations (or the dir given as argv[2]),
 * replays CREATE/DROP TABLE, ENABLE ROW LEVEL SECURITY and CREATE/DROP POLICY
 * in file order, and fails if any table in the public schema ends up with:
 *   - RLS not enabled, or
 *   - RLS enabled but zero policies (deny-all, almost always a mistake)
 * unless it is listed in supabase/rls-allowlist.json with a written reason.
 *
 * This is a static approximation. The authoritative check is
 * supabase/tests/rls_coverage.sql, run against a real database in CI.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.resolve(process.argv[2] ?? path.join(root, 'supabase/migrations'));
const allowPath = path.resolve(process.argv[3] ?? path.join(root, 'supabase/rls-allowlist.json'));

const stripComments = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const tables = new Map(); // name -> { rls: bool, policies: Set, file }
const dynamicRls = []; // files that enable RLS via EXECUTE/format (cannot be verified statically)

const tbl = '((?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\\.)?"?[a-zA-Z_][a-zA-Z0-9_]*"?)';
const polName = '("[^"]+"|[a-zA-Z0-9_]+)';
const events = new RegExp(
  [
    `(?<create>create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${tbl}\\s*\\()`,
    `(?<drop>drop\\s+table\\s+(?:if\\s+exists\\s+)?${tbl})`,
    `(?<rls>alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?${tbl}\\s+enable\\s+row\\s+level\\s+security)`,
    `(?<pol>create\\s+policy\\s+(?:if\\s+not\\s+exists\\s+)?${polName}\\s+on\\s+${tbl})`,
    `(?<dpol>drop\\s+policy\\s+(?:if\\s+exists\\s+)?${polName}\\s+on\\s+${tbl})`,
  ].join('|'),
  'gi',
);

const split = (raw) => {
  const parts = raw.replace(/"/g, '').split('.');
  return { schema: parts.length === 2 ? parts[0].toLowerCase() : 'public', name: parts[parts.length - 1].toLowerCase() };
};

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const sql = stripComments(raw);

  for (const m of sql.matchAll(events)) {
    const text = m[0].toLowerCase();
    if (/^create\s+table/.test(text)) {
      const { schema, name } = split(m[2]);
      if (schema === 'public' && !tables.has(name)) tables.set(name, { rls: false, policies: new Set(), file: f });
    } else if (/^drop\s+table/.test(text)) {
      const { schema, name } = split(m[4]);
      if (schema === 'public') tables.delete(name);
    } else if (/^alter\s+table/.test(text)) {
      const { schema, name } = split(m[6]);
      const t = schema === 'public' ? tables.get(name) : undefined;
      if (t) t.rls = true;
    } else if (/^create\s+policy/.test(text)) {
      const { schema, name } = split(m[9]);
      const t = schema === 'public' ? tables.get(name) : undefined;
      if (t) t.policies.add(m[8].replace(/"/g, '').toLowerCase());
    } else if (/^drop\s+policy/.test(text)) {
      const { schema, name } = split(m[12]);
      const t = schema === 'public' ? tables.get(name) : undefined;
      if (t) t.policies.delete(m[11].replace(/"/g, '').toLowerCase());
    }
  }
  if (/execute\s+format\s*\([^)]*row\s+level\s+security/i.test(sql) ||
      /execute\s+'[^']*row\s+level\s+security/i.test(sql)) {
    dynamicRls.push(f);
  }
}

let allow = {};
if (fs.existsSync(allowPath)) {
  allow = JSON.parse(fs.readFileSync(allowPath, 'utf8'));
}
for (const [name, reason] of Object.entries(allow)) {
  if (typeof reason !== 'string' || reason.trim().length < 15) {
    console.error(`rls-allowlist: "${name}" needs a written reason (15+ chars).`);
    process.exit(2);
  }
}

const noRls = [];
const noPolicy = [];
for (const [name, t] of [...tables].sort(([a], [b]) => a.localeCompare(b))) {
  if (allow[name]) continue;
  if (!t.rls) noRls.push([name, t.file]);
  else if (t.policies.size === 0) noPolicy.push([name, t.file]);
}

console.log(`Scanned ${files.length} migration file(s), ${tables.size} public table(s).`);
if (dynamicRls.length) {
  console.log(
    `Note: ${dynamicRls.length} file(s) enable RLS via dynamic SQL and cannot be verified statically: ${dynamicRls.join(', ')}`,
  );
  console.log('      The database-level check (supabase/tests/rls_coverage.sql) is authoritative for those.');
}
if (noRls.length) {
  console.error(`\nFAIL: ${noRls.length} table(s) without ROW LEVEL SECURITY:`);
  for (const [n, f] of noRls) console.error(`  - public.${n}  (created in ${f})`);
}
if (noPolicy.length) {
  console.error(`\nFAIL: ${noPolicy.length} table(s) with RLS enabled but no policies:`);
  for (const [n, f] of noPolicy) console.error(`  - public.${n}  (created in ${f})`);
}
if (noRls.length || noPolicy.length) process.exit(1);
console.log('OK: every public table has RLS enabled and at least one policy.');
