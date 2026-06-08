# Wasel Production Gate Report

Generated: 2026-06-08T07:35:33.358Z
Evidence-based score: 10/10
10/10 certified: yes

## Checks

### PASS - backend-production-build

backend TypeScript production service build passed

### PASS - docker-runtime-available

Docker version 29.4.3, build 055a478

### PASS - kubernetes-runtime-available

current context: kind-kind-cluster

### PASS - kubernetes-production-pods

all wasel-production pods are Ready and using approved Wasel production runtime images

NAME                                         READY   STATUS    RESTARTS   AGE     IP            NODE                         NOMINATED NODE   READINESS GATES
wasel-matching-worker-7757d89d-5xdfs         1/1     Running   0          4m29s   10.244.0.72   kind-cluster-control-plane   <none>           <none>
wasel-matching-worker-7757d89d-sb742         1/1     Running   0          4m20s   10.244.0.78   kind-cluster-control-plane   <none>           <none>
wasel-notification-worker-745fbd498b-f4ttb   1/1     Running   0          4m12s   10.244.0.81   kind-cluster-control-plane   <none>           <none>
wasel-notification-worker-745fbd498b-zsbnt   1/1     Running   0          4m21s   10.244.0.77   kind-cluster-control-plane   <none>           <none>
wasel-ops-worker-6bb97cff86-spj5v            1/1     Running   0          4m18s   10.244.0.79   kind-cluster-control-plane   <none>           <none>
wasel-package-worker-867c5c996-kqxhj         1/1     Running   0          4m26s   10.244.0.73   kind-cluster-control-plane   <none>           <none>
wasel-package-worker-867c5c996-v5mmt         1/1     Running   0          4m17s   10.244.0.80   kind-cluster-control-plane   <none>           <none>
wasel-payment-worker-9cf974f65-7skn4         1/1     Running   0          4m24s   10.244.0.75   kind-cluster-control-plane   <none>           <none>
wasel-payment-worker-9cf974f65-clcrx         1/1     Running   0          4m11s   10.244.0.82   kind-cluster-control-plane   <none>           <none>
wasel-web-5f6c6f5867-8ll69                   1/1     Running   0          4m31s   10.244.0.71   kind-cluster-control-plane   <none>           <none>
wasel-web-5f6c6f5867-jrg5w                   1/1     Running   0          4m24s   10.244.0.76   kind-cluster-control-plane   <none>           <none>
wasel-web-5f6c6f5867-kf2ws                   1/1     Running   0          4m25s   10.244.0.74   kind-cluster-control-plane   <none>           <none>
wasel-web-5f6c6f5867-qgxcj                   1/1     Running   0          4m32s   10.244.0.70   kind-cluster-control-plane   <none>           <none>

```text
runtime images:
wasel-matching-worker-7757d89d-5xdfs/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-matching-worker-7757d89d-sb742/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-notification-worker-745fbd498b-f4ttb/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-notification-worker-745fbd498b-zsbnt/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-ops-worker-6bb97cff86-spj5v/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-package-worker-867c5c996-kqxhj/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-package-worker-867c5c996-v5mmt/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-payment-worker-9cf974f65-7skn4/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-payment-worker-9cf974f65-clcrx/worker: ghcr.io/wasel-smart/wasel-worker:latest
wasel-web-5f6c6f5867-8ll69/web: ghcr.io/wasel-smart/wasel-web:latest
wasel-web-5f6c6f5867-jrg5w/web: ghcr.io/wasel-smart/wasel-web:latest
wasel-web-5f6c6f5867-kf2ws/web: ghcr.io/wasel-smart/wasel-web:latest
wasel-web-5f6c6f5867-qgxcj/web: ghcr.io/wasel-smart/wasel-web:latest
```

### PASS - independent-service-dockerfiles

production Dockerfiles exist for core backend services

### PASS - redis-streams-durable-contract

production Redis broker includes publish, consumer groups, ack, pending recovery, claim, and DLQ

### PASS - payment-lifecycle-contract

payment service contains Stripe capture, refund, and idempotency contract

### PASS - frontend-direct-db-access

no frontend direct Supabase query paths found

### PASS - mock-fallback-runtime-paths

no disallowed mock/fallback/demo runtime paths found

### PASS - load-test-execution-ready

k6 available: k6.exe v1.7.1 (commit/9f82e6f1fc, go1.26.1, windows/amd64)
