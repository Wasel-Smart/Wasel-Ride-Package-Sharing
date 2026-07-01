import postgres from 'postgres';
import { loadConfig } from './config/app.config.js';
const config = loadConfig();
let dbInstance = null;
export function getDb() {
    if (!dbInstance) {
        dbInstance = postgres(config.database.url, {
            max: config.database.maxConnections,
            idle_timeout: config.database.idleTimeoutSeconds * 1000,
            connect_timeout: config.database.connectionTimeoutSeconds * 1000,
        });
    }
    return dbInstance;
}
export async function disconnectDb() {
    if (dbInstance) {
        await dbInstance.end();
        dbInstance = null;
    }
}
