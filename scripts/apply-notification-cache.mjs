import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');
const filePath = join(root, 'src/services/notifications.ts');

const original = readFileSync(filePath, 'utf8');
const lines = original.split(/\r?\n/);

// 1. Insert cache definitions after LOCAL_NOTIFICATION_KEY
let insertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const LOCAL_NOTIFICATION_KEY = 'wasel-local-notifications';")) {
    insertIdx = i + 1;
    break;
  }
}
if (insertIdx === -1) throw new Error('LOCAL_NOTIFICATION_KEY not found');

const cacheDef = [
  '',
  '// In-memory cache for notifications to reduce database I/O',
  'type NotificationCacheEntry = {',
  '  data: StoredNotification[];',
  '  timestamp: number;',
  '};',
  'const notificationCache = new Map<string, NotificationCacheEntry>();',
  'const NOTIFICATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes',
];
lines.splice(insertIdx, 0, ...cacheDef);

// 2. Find position to insert cache check (after userId validation, before canUseEdgeApi check)
let cacheCheckInsertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === "if (!canUseEdgeApi()) {" && i > 200) {
    cacheCheckInsertIdx = i;
    break;
  }
}
if (cacheCheckInsertIdx === -1) throw new Error('canUseEdgeApi check not found');

const cacheCheck = [
  '    // Check cache for server notifications',
  '    const cachedEntry = notificationCache.get(userId);',
  '    const now = Date.now();',
  '    if (cachedEntry && (now - cachedEntry.timestamp < NOTIFICATION_CACHE_TTL)) {',
  '      return {',
  '        notifications: mergeNotifications(localNotifications, cachedEntry.data),',
  '      };',
  '    }',
  '',
];
lines.splice(cacheCheckInsertIdx, 0, ...cacheCheck);

// 3. After adding cache check, recalc the index for direct branch
let directInsertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const serverNotifications = await getDirectNotifications(userId);')) {
    directInsertIdx = i + 1;
    break;
  }
}
if (directInsertIdx === -1) throw new Error('direct getDirectNotifications not found');
lines.splice(directInsertIdx, 0, '        notificationCache.set(userId, { data: serverNotifications as StoredNotification[], timestamp: Date.now() });');

// 4. After edge branch assignment
let edgeInsertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const serverNotifications = Array.isArray(data?.notifications) ? data.notifications : [];')) {
    edgeInsertIdx = i + 1;
    break;
  }
}
if (edgeInsertIdx === -1) throw new Error('edge serverNotifications line not found');
lines.splice(edgeInsertIdx, 0, '      notificationCache.set(userId, { data: serverNotifications, timestamp: Date.now() });');

// Write back
writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('notifications.ts patched successfully');
