# Wasel Production Gate Report

Generated: 2026-06-08T03:16:30.674Z
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

all wasel-production pods are Ready

NAME                                        READY   STATUS    RESTARTS   AGE     IP            NODE                         NOMINATED NODE   READINESS GATES
wasel-matching-worker-6f9879cbb4-bg4tg      1/1     Running   0          9m41s   10.244.0.29   kind-cluster-control-plane   <none>           <none>
wasel-matching-worker-6f9879cbb4-cg29m      1/1     Running   0          9m6s    10.244.0.41   kind-cluster-control-plane   <none>           <none>
wasel-notification-worker-8bf868584-5klp5   1/1     Running   0          9m4s    10.244.0.42   kind-cluster-control-plane   <none>           <none>
wasel-notification-worker-8bf868584-gxxdc   1/1     Running   0          9m35s   10.244.0.30   kind-cluster-control-plane   <none>           <none>
wasel-ops-worker-5d87c95b7f-v6wj7           1/1     Running   0          9m31s   10.244.0.31   kind-cluster-control-plane   <none>           <none>
wasel-package-worker-56568ffcf-g492d        1/1     Running   0          9m26s   10.244.0.34   kind-cluster-control-plane   <none>           <none>
wasel-package-worker-56568ffcf-j79wp        1/1     Running   0          8m36s   10.244.0.48   kind-cluster-control-plane   <none>           <none>
wasel-payment-worker-c8bd55685-k9djj        1/1     Running   0          9m16s   10.244.0.36   kind-cluster-control-plane   <none>           <none>
wasel-payment-worker-c8bd55685-w9mgt        1/1     Running   0          8m55s   10.244.0.45   kind-cluster-control-plane   <none>           <none>
wasel-web-584cd88f75-5s4tl                  1/1     Running   0          9m11s   10.244.0.38   kind-cluster-control-plane   <none>           <none>
wasel-web-584cd88f75-65qqc                  1/1     Running   0          8m41s   10.244.0.47   kind-cluster-control-plane   <none>           <none>
wasel-web-584cd88f75-674c4                  1/1     Running   0          9m10s   10.244.0.39   kind-cluster-control-plane   <none>           <none>
wasel-web-584cd88f75-h8wzq                  1/1     Running   0          8m45s   10.244.0.46   kind-cluster-control-plane   <none>           <none>

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
