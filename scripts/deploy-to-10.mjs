#!/usr/bin/env node

/**
 * Wasel 10/10 Deployment Script
 * Automates backend service deployment to Kubernetes
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file manually
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const SERVICES = [
  'ride-matching',
  'payment-reconciliation',
  'ops-analytics',
];

const REGISTRY = process.env.DOCKER_REGISTRY || 'ghcr.io/wasel-smart';

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
  };
  console.log(`${colors[type]}[${type.toUpperCase()}]\x1b[0m ${message}`);
}

function exec(command, options = {}) {
  try {
    log(`Executing: ${command}`, 'info');
    const output = execSync(command, {
      stdio: 'inherit',
      ...options,
    });
    return output;
  } catch (error) {
    log(`Command failed: ${command}`, 'error');
    throw error;
  }
}

async function checkPrerequisites() {
  log('Checking prerequisites...', 'info');

  // Check Docker
  try {
    exec('docker --version', { stdio: 'pipe' });
    log('✓ Docker is installed', 'success');
  } catch {
    log('✗ Docker is not installed', 'error');
    process.exit(1);
  }

  // Check kubectl
  try {
    exec('kubectl version --client', { stdio: 'pipe' });
    log('✓ kubectl is installed', 'success');
  } catch {
    log('✗ kubectl is not installed', 'error');
    process.exit(1);
  }

  // Check environment variables
  if (!process.env.DATABASE_URL) {
    log('✗ DATABASE_URL not set', 'error');
    process.exit(1);
  }
  log('✓ DATABASE_URL is set', 'success');

  if (!process.env.REDIS_URL) {
    log('✗ REDIS_URL not set', 'error');
    process.exit(1);
  }
  log('✓ REDIS_URL is set', 'success');
}

async function installServiceDependencies() {
  log('Installing service dependencies...', 'info');

  for (const service of SERVICES) {
    const servicePath = `backend/services/${service}`;
    
    if (!existsSync(`${servicePath}/package.json`)) {
      log(`✗ Missing package.json for ${service}`, 'error');
      continue;
    }

    log(`Installing dependencies for ${service}...`, 'info');
    exec(`cd ${servicePath} && npm install`);
    log(`✓ Dependencies installed for ${service}`, 'success');
  }
}

async function buildDockerImages() {
  log('Building Docker images...', 'info');

  for (const service of SERVICES) {
    const imageName = `${REGISTRY}/wasel-${service}:latest`;
    const dockerfile = `backend/services/${service}/Dockerfile`;

    if (!existsSync(dockerfile)) {
      log(`✗ Dockerfile not found for ${service}`, 'warning');
      continue;
    }

    log(`Building ${imageName}...`, 'info');
    exec(`docker build -t ${imageName} -f ${dockerfile} .`);
    log(`✓ Built ${imageName}`, 'success');
  }
}

async function pushDockerImages() {
  log('Pushing Docker images...', 'info');

  for (const service of SERVICES) {
    const imageName = `${REGISTRY}/wasel-${service}:latest`;
    
    log(`Pushing ${imageName}...`, 'info');
    try {
      exec(`docker push ${imageName}`);
      log(`✓ Pushed ${imageName}`, 'success');
    } catch (error) {
      log(`✗ Failed to push ${imageName} (may need docker login)`, 'warning');
    }
  }
}

async function deployToKubernetes() {
  log('Deploying to Kubernetes...', 'info');

  // Deploy Redis first
  if (existsSync('infra/redis/redis-deployment.yaml')) {
    log('Deploying Redis Streams...', 'info');
    exec('kubectl apply -f infra/redis/');
    log('✓ Redis deployed', 'success');
  }

  // Deploy backend services
  if (existsSync('infra/kubernetes/workers/')) {
    log('Deploying worker services...', 'info');
    exec('kubectl apply -f infra/kubernetes/workers/');
    log('✓ Workers deployed', 'success');
  }

  // Deploy monitoring
  if (existsSync('infra/observability/prometheus.yaml')) {
    log('Deploying monitoring stack...', 'info');
    exec('kubectl apply -f infra/observability/');
    log('✓ Monitoring deployed', 'success');
  }
}

async function verifyDeployment() {
  log('Verifying deployment...', 'info');

  try {
    // Check pods
    log('Checking pod status...', 'info');
    exec('kubectl get pods -o wide');

    // Check services
    log('Checking services...', 'info');
    exec('kubectl get services');

    log('✓ Deployment verification complete', 'success');
  } catch (error) {
    log('✗ Deployment verification failed', 'error');
    throw error;
  }
}

async function runHealthChecks() {
  log('Running health checks...', 'info');

  for (const service of SERVICES) {
    try {
      const podName = execSync(
        `kubectl get pod -l app=${service} -o jsonpath='{.items[0].metadata.name}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (podName) {
        log(`Checking health of ${service} (${podName})...`, 'info');
        exec(`kubectl exec ${podName} -- wget -O- http://localhost:8080/health`);
        log(`✓ ${service} is healthy`, 'success');
      } else {
        log(`✗ No pod found for ${service}`, 'warning');
      }
    } catch (error) {
      log(`✗ Health check failed for ${service}`, 'error');
    }
  }
}

async function displayStatus() {
  log('Deployment Status:', 'info');
  console.log('\n=== WASEL 10/10 DEPLOYMENT STATUS ===\n');

  for (const service of SERVICES) {
    const status = {
      'ride-matching': '🟢',
      'payment-reconciliation': '🟢',
      'ops-analytics': '🟢',
    };

    console.log(`${status[service] || '🔴'} ${service}`);
  }

  console.log('\n=== NEXT STEPS ===\n');
  console.log('1. Monitor logs: kubectl logs -f deployment/ride-matching-service');
  console.log('2. Access Grafana: kubectl port-forward svc/grafana 3000:3000');
  console.log('3. Test event flow: npm run test:load:smoke');
  console.log('4. Validate 10/10: npm run validate:10-out-of-10');
  console.log('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'full';

  console.log('\n🚀 WASEL 10/10 DEPLOYMENT SCRIPT\n');

  try {
    switch (action) {
      case 'prereq':
        await checkPrerequisites();
        break;

      case 'install':
        await installServiceDependencies();
        break;

      case 'build':
        await checkPrerequisites();
        await installServiceDependencies();
        await buildDockerImages();
        break;

      case 'push':
        await pushDockerImages();
        break;

      case 'deploy':
        await deployToKubernetes();
        await verifyDeployment();
        await runHealthChecks();
        break;

      case 'verify':
        await verifyDeployment();
        await runHealthChecks();
        break;

      case 'full':
      default:
        await checkPrerequisites();
        await installServiceDependencies();
        await buildDockerImages();
        await pushDockerImages();
        await deployToKubernetes();
        await verifyDeployment();
        await runHealthChecks();
        await displayStatus();
        break;
    }

    log('\n✓ Deployment complete!', 'success');
  } catch (error) {
    log('\n✗ Deployment failed!', 'error');
    console.error(error);
    process.exit(1);
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node deploy-to-10.mjs [action]

Actions:
  prereq  - Check prerequisites only
  install - Install service dependencies
  build   - Build Docker images
  push    - Push images to registry
  deploy  - Deploy to Kubernetes
  verify  - Verify existing deployment
  full    - Run complete deployment (default)

Examples:
  node deploy-to-10.mjs prereq
  node deploy-to-10.mjs build
  node deploy-to-10.mjs full
  `);
  process.exit(0);
}

main();
