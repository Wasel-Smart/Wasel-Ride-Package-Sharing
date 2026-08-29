#!/usr/bin/env node

// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(projectRoot, 'node_modules');

/**
 * @param {string} text
 * @returns {string}
 */
const color = (text) => `\x1b[33m${text}\x1b[0m`; // Yellow

function isOneDrivePath(path) {
    return /[\\/]OneDrive[\\/]/i.test(path);
}

function main() {
    if (process.platform !== 'win32' || !isOneDrivePath(projectRoot)) {
        // Not a Windows/OneDrive environment, no action needed.
        return;
    }

    try {
        const stats = fs.lstatSync(nodeModulesPath);
        if (stats.isSymbolicLink()) {
            // node_modules is already a junction/symlink, which is the correct setup.
            return;
        }
    } catch (error) {
        // If node_modules doesn't exist, lstatSync will throw. This is fine.
        if (error.code === 'ENOENT') {
            return;
        }
    }

    console.error(color('\n========================= ATTENTION =========================\n'));
    console.error(color('This project is in a OneDrive folder on Windows.'));
    console.error(color('Running "npm install" here directly may fail or cause issues.\n'));
    console.error(color('Recommended: run "npm install" from a non-OneDrive path, or use the'));
    console.error(color('junction fix script in a PowerShell terminal (as Administrator):'));
    console.error(color('\n  .\\scripts\\fix-node-modules.ps1\n'));
    console.error(color('Continuing install anyway — if it fails, move the project out of OneDrive.\n'));
}

main();