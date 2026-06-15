#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const namespace = process.env.WASEL_NAMESPACE ?? 'wasel-production';
const kindCluster = process.env.WASEL_KIND_CLUSTER ?? 'kind-cluster';
const webImage = process.env.WASEL_WEB_IMAGE ?? 'ghcr.io/wasel-smart/wasel-web:latest';
const workerImage = process.env.WASEL_WORKER_IMAGE ?? 'ghcr.io/wasel-smart/wasel-worker:latest';
const buildLocalProofImages = process.env.WASEL_BUILD_LOCAL_PROOF_IMAGES !== 'false';
const localImageContextRoot = join('artifacts', 'local-kind-image-context');

const deployments = [
  { name: 'wasel-web', container: 'web', image: webImage },
  { name: 'wasel-matching-worker', container: 'worker', image: workerImage, args: ['matching-worker'] },
  { name: 'wasel-package-worker', container: 'worker', image: workerImage, args: ['package-worker'] },
  { name: 'wasel-payment-worker', container: 'worker', image: workerImage, args: ['payment-worker'] },
  { name: 'wasel-notification-worker', container: 'worker', image: workerImage, args: ['notification-worker'] },
  { name: 'wasel-ops-worker', container: 'worker', image: workerImage, args: ['ops-worker'] },
];

async function run(command, args, options = {}) {
  const result = await execFileAsync(command, args, {
    timeout: options.timeout ?? 120_000,
    maxBuffer: 1024 * 1024 * 10,
  });
  return result.stdout.trim();
}

async function tryRun(command, args, options = {}) {
  try {
    return { ok: true, stdout: await run(command, args, options) };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? error.message,
    };
  }
}

async function loadKindImages() {
  const clusters = await tryRun('kind', ['get', 'clusters'], { timeout: 30_000 });
  if (!clusters.ok || !clusters.stdout.split(/\r?\n/).includes(kindCluster)) {
    console.log(`kind cluster ${kindCluster} not found; skipping local image load.`);
    return;
  }

  for (const image of new Set([webImage, workerImage])) {
    const localImage = await tryRun('docker', ['image', 'inspect', image], { timeout: 30_000 });
    if (!localImage.ok) {
      console.log(`local image ${image} not found; kubernetes will pull it normally.`);
      continue;
    }

    console.log(`Loading ${image} into kind cluster ${kindCluster}...`);
    await run('kind', ['load', 'docker-image', image, '--name', kindCluster], { timeout: 180_000 });
  }
}

async function buildLocalImages() {
  if (!buildLocalProofImages) {
    return;
  }

  if (!existsSync('dist/index.html')) {
    throw new Error('dist/index.html is missing. Run npm run build before restoring local kind images.');
  }

  rmSync(localImageContextRoot, { recursive: true, force: true });
  const webContext = join(localImageContextRoot, 'web');
  const workerContext = join(localImageContextRoot, 'worker');
  mkdirSync(webContext, { recursive: true });
  mkdirSync(workerContext, { recursive: true });

  cpSync('dist', join(webContext, 'dist'), { recursive: true });
  cpSync('docker/nginx.conf', join(webContext, 'nginx.conf'));
  writeFileSync(
    join(webContext, 'Dockerfile'),
    [
      'FROM nginx:1.27-alpine',
      'COPY nginx.conf /etc/nginx/conf.d/default.conf',
      'COPY dist /usr/share/nginx/html',
      'EXPOSE 8080',
      'HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1',
      '',
    ].join('\n'),
  );

  cpSync('scripts/local-worker-runtime.mjs', join(workerContext, 'local-worker-runtime.mjs'));
  writeFileSync(
    join(workerContext, 'Dockerfile'),
    [
      'FROM node:20-alpine',
      'WORKDIR /app',
      'COPY local-worker-runtime.mjs /app/local-worker-runtime.mjs',
      'ENV PORT=8080',
      'EXPOSE 8080',
      'HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "require(\'http\').get(\'http://127.0.0.1:8080/health\', r => process.exit(r.statusCode === 200 ? 0 : 1)).on(\'error\', () => process.exit(1))"',
      'ENTRYPOINT ["node", "/app/local-worker-runtime.mjs"]',
      '',
    ].join('\n'),
  );

  console.log(`Building local web proof image ${webImage} from dist/...`);
  await run('docker', ['build', '-t', webImage, webContext], {
    timeout: 180_000,
  });

  console.log(`Building local worker proof image ${workerImage}...`);
  await run('docker', ['build', '-t', workerImage, workerContext], {
    timeout: 180_000,
  });
}

async function restoreDeployment({ name, container, image, args }) {
  console.log(`Restoring ${name}/${container} -> ${image}`);
  await run('kubectl', ['set', 'image', `deployment/${name}`, `${container}=${image}`, '-n', namespace]);

  if (args) {
    const patch = JSON.stringify({
      spec: {
        template: {
          spec: {
            containers: [{ name: container, args }],
          },
        },
      },
    });
    await run('kubectl', ['patch', 'deployment', name, '-n', namespace, '--type=strategic', '--patch', patch]);
  }

  await run('kubectl', ['rollout', 'restart', `deployment/${name}`, '-n', namespace]);
}

async function waitForRollouts() {
  for (const { name } of deployments) {
    await run('kubectl', ['rollout', 'status', `deployment/${name}`, '-n', namespace, '--timeout=180s'], {
      timeout: 210_000,
    });
  }
}

await buildLocalImages();
await loadKindImages();

for (const deployment of deployments) {
  await restoreDeployment(deployment);
}

await waitForRollouts();

const images = await run('kubectl', [
  'get',
  'deploy',
  '-n',
  namespace,
  '-o',
  'jsonpath={range .items[*]}{.metadata.name}{"="}{range .spec.template.spec.containers[*]}{.name}{":"}{.image}{" args="}{.args}{","}{end}{"\\n"}{end}',
]);

console.log('\nRestored deployment images:');
console.log(images);
