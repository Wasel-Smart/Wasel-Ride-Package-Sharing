import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const requiredFiles = [
  'infra/README.md',
  'infra/kubernetes/base/kustomization.yaml',
  'infra/kubernetes/base/deployment.yaml',
  'infra/kubernetes/base/service.yaml',
  'infra/kubernetes/base/ingress.yaml',
  'infra/kubernetes/base/hpa.yaml',
  'infra/kubernetes/base/pdb.yaml',
  'infra/kubernetes/base/networkpolicy.yaml',
  'infra/kubernetes/workers/kustomization.yaml',
  'infra/kubernetes/workers/worker-configmap.yaml',
  'infra/kubernetes/workers/matching-worker.yaml',
  'infra/kubernetes/workers/package-worker.yaml',
  'infra/kubernetes/workers/payment-worker.yaml',
  'infra/kubernetes/workers/notification-worker.yaml',
  'infra/kubernetes/workers/ops-worker.yaml',
  'infra/kubernetes/overlays/dev/kustomization.yaml',
  'infra/kubernetes/overlays/dev/web-deployment-patch.yaml',
  'infra/kubernetes/overlays/dev/web-hpa-patch.yaml',
  'infra/kubernetes/overlays/dev/web-ingress-patch.yaml',
  'infra/kubernetes/overlays/staging/kustomization.yaml',
  'infra/kubernetes/overlays/staging/web-deployment-patch.yaml',
  'infra/kubernetes/overlays/staging/web-hpa-patch.yaml',
  'infra/kubernetes/overlays/staging/web-ingress-patch.yaml',
  'infra/kubernetes/overlays/prod/kustomization.yaml',
  'infra/kubernetes/overlays/prod/web-deployment-patch.yaml',
  'infra/kubernetes/overlays/prod/web-hpa-patch.yaml',
  'infra/kubernetes/overlays/prod/web-ingress-patch.yaml',
  'infra/observability/README.md',
  'infra/observability/otel-collector.yaml',
  'infra/observability/prometheus.yml',
  'infra/observability/loki-config.yaml',
  'infra/observability/grafana-dashboard-wasel-overview.json',
  'docs/workers-and-queues.md',
];

await Promise.all(
  requiredFiles.map(async (relativePath) => {
    const fullPath = path.join(process.cwd(), relativePath);
    await access(fullPath);
  }),
);

console.log(`Infrastructure assets validated: ${requiredFiles.length} files present.`);
