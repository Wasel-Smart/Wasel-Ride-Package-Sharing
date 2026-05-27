import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const workerManifests = [
  ['matching-worker', 'infra/kubernetes/workers/matching-worker.yaml'],
  ['package-worker', 'infra/kubernetes/workers/package-worker.yaml'],
  ['payment-worker', 'infra/kubernetes/workers/payment-worker.yaml'],
  ['notification-worker', 'infra/kubernetes/workers/notification-worker.yaml'],
  ['ops-worker', 'infra/kubernetes/workers/ops-worker.yaml'],
];

for (const [workerName, relativePath] of workerManifests) {
  const manifest = await readFile(path.join(process.cwd(), relativePath), 'utf8');

  const escapedWorkerName = workerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasInlineArg = new RegExp(`args:\\s*\\[\\s*["']${escapedWorkerName}["']\\s*\\]`).test(manifest);
  const hasListArg = new RegExp(`^\\s*-\\s*["']?${escapedWorkerName}["']?\\s*$`, 'm').test(manifest);

  if (!hasInlineArg && !hasListArg) {
    throw new Error(`Worker manifest ${relativePath} must start ${workerName}`);
  }
}

const queueDocPath = path.join(process.cwd(), 'docs', 'workers-and-queues.md');
const queueDoc = await readFile(queueDocPath, 'utf8');
for (const topic of [
  'rides.requested',
  'rides.assigned',
  'rides.completed',
  'packages.created',
  'packages.location-updated',
  'packages.delivered',
  'payments.authorized',
  'payments.captured',
  'notifications.dispatch',
]) {
  if (!queueDoc.includes(topic)) {
    throw new Error(`Queue documentation is missing topic ${topic}`);
  }
}

const overlayPairs = [
  ['dev', 'dev.wasel.local'],
  ['staging', 'staging.wasel14.online'],
  ['prod', 'wasel14.online'],
];

for (const [overlayName, expectedHost] of overlayPairs) {
  const ingressPatchPath = path.join(
    process.cwd(),
    'infra',
    'kubernetes',
    'overlays',
    overlayName,
    'web-ingress-patch.yaml',
  );
  const ingressPatch = await readFile(ingressPatchPath, 'utf8');
  if (!ingressPatch.includes(expectedHost)) {
    throw new Error(`Overlay ${overlayName} ingress patch must target host ${expectedHost}`);
  }
}

console.log('Service topology validated across workers, queue docs, and overlays.');
