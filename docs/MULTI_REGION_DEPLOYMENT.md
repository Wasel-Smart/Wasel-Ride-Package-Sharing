# Multi-Region Deployment Strategy

## Overview

Wasel is expanding beyond Jordan to support multiple Middle East and North Africa (MENA) markets. This document outlines the multi-region deployment architecture, data sovereignty considerations, and rollout strategy.

## Supported Regions

### Phase 1: Jordan (Current)
- **Region Code**: `jo`
- **Data Center**: AWS `me-south-1` (Bahrain)
- **CDN**: Vercel Edge Network
- **Database**: Supabase (Middle East)
- **Status**: ✅ Production

### Phase 2: UAE (Q3 2026)
- **Region Code**: `ae`
- **Cities**: Dubai, Abu Dhabi, Sharjah
- **Data Center**: AWS `me-south-1` (Bahrain)
- **Regulatory**: UAE Data Protection Law compliance
- **Status**: 🔄 Planning

### Phase 3: Saudi Arabia (Q4 2026)
- **Region Code**: `sa`
- **Cities**: Riyadh, Jeddah, Dammam
- **Data Center**: AWS `me-central-1` (UAE) - *when available*
- **Regulatory**: PDPL (Personal Data Protection Law) compliance
- **Status**: 📋 Roadmap

### Phase 4: Egypt (Q1 2027)
- **Region Code**: `eg`
- **Cities**: Cairo, Alexandria, Giza
- **Data Center**: AWS `me-south-1` (Bahrain)
- **Regulatory**: Data Protection Law No. 151 of 2020
- **Status**: 📋 Roadmap

## Architecture

### Regional Service Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Load Balancer                     │
│                  (Route 53 / Cloudflare)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────┬─────────────┐
                              │             │             │
                    ┌─────────▼──┐   ┌─────▼──────┐  ┌──▼─────────┐
                    │  Jordan    │   │    UAE     │  │   Saudi    │
                    │  (Primary) │   │ (Secondary)│  │ (Tertiary) │
                    └────────────┘   └────────────┘  └────────────┘
                         │                │                │
                    ┌────▼────────────────▼────────────────▼─────┐
                    │       Regional PostgreSQL Clusters        │
                    │         (Read Replicas per Region)        │
                    └───────────────────────────────────────────┘
```

### Data Residency Strategy

1. **User Data**: Stored in user's home region
2. **Ride/Package Data**: Stored where trip originates
3. **Payment Data**: Tokenized, metadata in home region
4. **Analytics**: Aggregated globally, anonymized
5. **Logs**: Regional storage, 30-day retention

## Regional Configuration

### Environment Variables

```bash
# Regional API Endpoints
VITE_API_REGION=jo
VITE_API_ENDPOINT_JO=https://api-jo.wasel.me
VITE_API_ENDPOINT_AE=https://api-ae.wasel.me
VITE_API_ENDPOINT_SA=https://api-sa.wasel.me
VITE_API_ENDPOINT_EG=https://api-eg.wasel.me

# Regional Database
DATABASE_REGION=me-south-1
DATABASE_READ_REPLICA_REGIONS=me-south-1,eu-west-1

# Regional Object Storage
S3_BUCKET_JO=wasel-jordan-prod
S3_BUCKET_AE=wasel-uae-prod
S3_BUCKET_SA=wasel-saudi-prod

# Regional Payment Providers
STRIPE_ACCOUNT_JO=acct_jordan_xxx
STRIPE_ACCOUNT_AE=acct_uae_xxx
STRIPE_ACCOUNT_SA=acct_saudi_xxx
```

### Database Schema Updates

```sql
-- Regional user assignment
ALTER TABLE users ADD COLUMN home_region text NOT NULL DEFAULT 'jo';
ALTER TABLE users ADD CONSTRAINT users_home_region_check 
  CHECK (home_region IN ('jo', 'ae', 'sa', 'eg'));

-- Cross-region trip support
ALTER TABLE trips ADD COLUMN origin_region text NOT NULL DEFAULT 'jo';
ALTER TABLE trips ADD COLUMN destination_region text;

-- Regional compliance flags
ALTER TABLE users ADD COLUMN data_residency_consent jsonb DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN regional_gdpr_preferences jsonb DEFAULT '{}'::jsonb;
```

## Routing Strategy

### Geographic Routing

```typescript
export function getRegionalEndpoint(userRegion: string): string {
  const endpoints = {
    jo: import.meta.env.VITE_API_ENDPOINT_JO,
    ae: import.meta.env.VITE_API_ENDPOINT_AE,
    sa: import.meta.env.VITE_API_ENDPOINT_SA,
    eg: import.meta.env.VITE_API_ENDPOINT_EG,
  };

  return endpoints[userRegion as keyof typeof endpoints] || endpoints.jo;
}

export function detectUserRegion(): string {
  // Priority: 1) User profile 2) Geolocation 3) IP-based 4) Default
  const storedRegion = localStorage.getItem('user_region');
  if (storedRegion) return storedRegion;

  // Detect from browser geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const region = mapCoordinatesToRegion(
        position.coords.latitude,
        position.coords.longitude
      );
      localStorage.setItem('user_region', region);
    });
  }

  return 'jo'; // Default to Jordan
}

function mapCoordinatesToRegion(lat: number, lng: number): string {
  // Jordan: 29.18°N - 33.38°N, 34.95°E - 39.30°E
  if (lat >= 29.18 && lat <= 33.38 && lng >= 34.95 && lng <= 39.30) return 'jo';
  
  // UAE: 22.63°N - 26.14°N, 51.58°E - 56.40°E
  if (lat >= 22.63 && lat <= 26.14 && lng >= 51.58 && lng <= 56.40) return 'ae';
  
  // Saudi Arabia: 16.38°N - 32.15°N, 34.50°E - 55.67°E
  if (lat >= 16.38 && lat <= 32.15 && lng >= 34.50 && lng <= 55.67) return 'sa';
  
  // Egypt: 22.00°N - 31.67°N, 24.70°E - 36.90°E
  if (lat >= 22.00 && lat <= 31.67 && lng >= 24.70 && lng <= 36.90) return 'eg';
  
  return 'jo'; // Default
}
```

## Load Testing at Scale

### Regional Load Test Configuration

```javascript
// tests/load/k6-multi-region.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    jordan: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      env: { REGION: 'jo' },
    },
    uae: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      env: { REGION: 'ae' },
    },
    saudi: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '2m', target: 0 },
      ],
      env: { REGION: 'sa' },
    },
  },
  thresholds: {
    'http_req_duration{region:jo}': ['p(95)<700'],
    'http_req_duration{region:ae}': ['p(95)<700'],
    'http_req_duration{region:sa}': ['p(95)<700'],
  },
};
```

## Compliance & Regulatory

### GDPR/Data Protection

- **Jordan**: PDPL compliance
- **UAE**: DIFC Data Protection Law
- **Saudi Arabia**: PDPL + local banking regulations
- **Egypt**: Law No. 151 of 2020

### Right to Data Portability

```typescript
export async function exportUserData(userId: string, region: string): Promise<Blob> {
  const endpoint = getRegionalEndpoint(region);
  const response = await fetch(`${endpoint}/v1/users/${userId}/export`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  return await response.blob();
}
```

## Deployment Process

### Regional Rollout Checklist

- [ ] Deploy regional database cluster
- [ ] Configure regional API endpoints
- [ ] Set up regional CDN distribution
- [ ] Configure regional payment provider
- [ ] Enable regional SMS/WhatsApp providers
- [ ] Update DNS records for regional routing
- [ ] Run regional load tests
- [ ] Verify data residency compliance
- [ ] Train regional support team
- [ ] Soft launch with 10% traffic
- [ ] Monitor SLOs for 7 days
- [ ] Full regional launch

## Monitoring

### Regional Metrics Dashboard

```typescript
export interface RegionalMetrics {
  region: string;
  activeUsers: number;
  ridesCompleted: number;
  packagesDelivered: number;
  apiLatencyP95: number;
  errorRate: number;
  sloCompliance: boolean;
}

export async function getRegionalMetrics(): Promise<RegionalMetrics[]> {
  const regions = ['jo', 'ae', 'sa', 'eg'];
  const metrics = await Promise.all(
    regions.map(region => 
      fetch(`https://api-${region}.wasel.me/metrics`).then(r => r.json())
    )
  );
  
  return metrics;
}
```

## Failover Strategy

### Cross-Region Failover

1. **Health Check Failure**: Regional endpoint fails health check
2. **Automatic Routing**: Route 53 directs to nearest healthy region
3. **Read Replica Promotion**: Promote read replica to primary (if needed)
4. **User Notification**: In-app notification of temporary regional redirect
5. **Post-Incident**: Failback to primary region when healthy

## Cost Optimization

### Regional Pricing Strategy

- **Jordan**: Standard pricing (base market)
- **UAE**: +15% (higher GDP per capita)
- **Saudi Arabia**: +12% (larger market, competitive)
- **Egypt**: -10% (price-sensitive market)

### Infrastructure Costs

- **Jordan**: $5,000/month (current)
- **UAE**: $3,500/month (estimated)
- **Saudi Arabia**: $4,000/month (estimated)
- **Egypt**: $2,500/month (estimated)

**Total Multi-Region**: ~$15,000/month for 4 regions

## Success Metrics

### Regional KPIs

| Metric | Jordan | UAE | Saudi | Egypt |
|--------|--------|-----|-------|-------|
| Active Users | 50,000 | 30,000 | 40,000 | 25,000 |
| Daily Rides | 5,000 | 3,000 | 4,000 | 2,500 |
| Revenue/Month | $50K | $45K | $48K | $25K |
| SLO Compliance | 99.9% | 99.9% | 99.9% | 99.5% |

## Timeline

- **Q2 2026**: Jordan production (✅ Complete)
- **Q3 2026**: UAE launch
- **Q4 2026**: Saudi Arabia launch
- **Q1 2027**: Egypt launch
- **Q2 2027**: Additional MENA markets

---

**Status**: Multi-region architecture designed and ready for deployment. Jordan production validated. UAE launch planned for Q3 2026.
