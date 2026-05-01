# Infrastructure Assets

This directory turns the platform posture described in the docs into deployable artifacts.

## Layout

- `kubernetes/base`: baseline runtime manifests for the web client
- `kubernetes/overlays`: dev, staging, and production environment overlays
- `observability`: collector, metrics, and dashboard scaffolding

## Intent

The repository still ships a web application, but the infra assets make the production target explicit:

- rolling deployments
- autoscaling
- ingress and network policy
- pod disruption protection
- metrics and traces
- centralized logs

Use these as the base layer for a real environment, then overlay environment-specific settings for staging and production.
