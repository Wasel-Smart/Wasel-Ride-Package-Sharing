# Wasel Backend Services

## Overview

Production-grade microservices for ride matching, payments, and analytics.

## Services

| Service | Description | Port | Health Endpoint |
|---------|-------------|------|-----------------|
| ride-matching | Geospatial driver matching using PostGIS | 8080 | `/health` |
| payment-reconciliation | Stripe + CliQ payment processing | 8080 | `/health` |
| ops-analytics | Operational metrics and analytics | 8080 | `/health` |

## Quick Start

```bash
npm run bootstrap:backend
npm run dev --workspace=backend/services/ride-matching
```

## Configuration

| Variable | Service | Default |
|----------|---------|---------|
| DATABASE_URL | All | Required |
| REDIS_HOST | All | localhost |
| STRIPE_SECRET_KEY | payment-reconciliation | - |