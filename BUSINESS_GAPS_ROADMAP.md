# Business Gaps Roadmap

## Executive Summary

Wasel has excellent technical foundations but needs business infrastructure to compete with established players like Uber and Careem. This document outlines 8 critical business gaps and implementation plans.

---

## Gap 1: Compliance & Legal (Currently: 3/10)

### Current Status
- ❌ No insurance integration
- ❌ No liability coverage
- ❌ No background checks automated
- ❌ No compliance documentation
- ❌ No terms of service
- ❌ No privacy policy (for Jordan)

### Action Plan

**Phase 1: Legal Documentation (2 weeks)**
- Hire Jordan-based legal firm
- Create terms of service
- Create privacy policy (GDPR compliant for future EU)
- Create driver agreement
- Create passenger agreement
- Cost: $5K-10K

**Phase 2: Compliance Setup (1 week)**
- Set up data retention policies
- Implement data deletion mechanism
- Create audit logs for all actions
- Set up GDPR-ready infrastructure
- Cost: $2K

**Phase 3: Insurance Integration (3 weeks)**
- Partner with Jordan insurance company
- Integrate API for policy issuance
- Automate coverage verification
- Setup claims workflow
- Cost: Negotiation with insurer

**Timeline:** 6 weeks
**Priority:** CRITICAL (launch blocker)
**Cost:** $7K-12K + insurance partner agreement
**Impact on Rating:** +0.5 (8.3/10)

---

## Gap 2: Referral & Marketing Program (Currently: 0/10)

### Program Design

```
┌─────────────────────────────────────────────┐
│      WASEL REFERRAL PROGRAM                 │
├─────────────────────────────────────────────┤
│                                             │
│  Passengers:                                │
│  ├─ Refer friend → Friend completes 1st  │
│  ├─ Both get: 5 JOD free credit          │
│  └─ Unlimited referrals                  │
│                                             │
│  Drivers:                                   │
│  ├─ Refer driver → Driver completes 5   │
│  ├─ Referrer gets: 50 JOD bonus         │
│  ├─ Referred gets: 100 JOD signup bonus │
│  └─ Max 10 referrals/month               │
│                                             │
│  Promotional Codes:                         │
│  ├─ "LAUNCH2026" → 10 JOD credit        │
│  ├─ "DRIVER50" → 50 JOD signup          │
│  └─ Season codes (Ramadan, holidays)    │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation (2 weeks)

```typescript
// Database schema
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  creator_id UUID,
  discount_jod INT,
  max_uses INT,
  used_count INT,
  expires_at TIMESTAMP
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  referrer_id UUID,
  referred_id UUID,
  code TEXT,
  reward_given BOOLEAN,
  created_at TIMESTAMP
);

// API endpoints
POST /referrals/generate-code → Generate shareable code
POST /referrals/apply-code → Apply code to account
GET /referrals/stats → Referral leaderboard
GET /referrals/earnings → Total referral earnings
```

**Timeline:** 2 weeks
**Cost:** $5K (development)
**Expected Impact:** 30-50% user growth in month 1
**Impact on Rating:** +0.3 (8.3/10)

---

## Gap 3: Promo Code System (Currently: 0/10)

### Campaign Strategy

**Launch Campaign:**
- "LAUNCH50" → 50 JOD first ride credit
- "DRIVER2026" → 200 JOD driver signup bonus
- Valid for 30 days from launch

**Monthly Campaigns:**
```
Month 1 (June): Launch push
├─ LAUNCH50: -50 JOD per ride
├─ Target: 5,000 new users
└─ Cost: 250K JOD

Month 2 (July): Retention focus
├─ COMEBACK20: -20 JOD if inactive >7 days
├─ REFER10: Referral bonus
└─ Cost: 100K JOD

Month 3 (August): Driver acquisition
├─ DRIVER300: 300 JOD driver bonus
├─ Target: 500 new drivers
└─ Cost: 150K JOD
```

### Admin Dashboard for Promos

```vue
<template>
  <div class="promo-manager">
    <button @click="createPromo">Create Campaign</button>
    
    <table>
      <tr v-for="promo in promos" :key="promo.id">
        <td>{{ promo.code }}</td>
        <td>{{ promo.discount }} JOD</td>
        <td>{{ promo.used_count }} / {{ promo.max_uses }}</td>
        <td>{{ promo.status }}</td>
        <td>
          <button @click="editPromo(promo)">Edit</button>
          <button @click="stopPromo(promo)">Stop</button>
        </td>
      </tr>
    </table>
  </div>
</template>
```

**Timeline:** 1 week
**Cost:** $3K
**Expected ROI:** 10x (if 250K JOD spent generates 1M+ in rides)
**Impact on Rating:** +0.2 (8.2/10)

---

## Gap 4: Admin Analytics Dashboard (Currently: 2/10)

### Required Metrics

```
┌─────────────────────────────────────────────┐
│    ADMIN ANALYTICS DASHBOARD                │
├─────────────────────────────────────────────┤
│                                             │
│  Real-time Metrics (Top of page):           │
│  ├─ Active Users: 342                       │
│  ├─ Rides In Progress: 87                   │
│  ├─ Revenue Today: 3,245 JOD                │
│  ├─ System Health: 99.8% uptime            │
│  └─ Errors/min: 0.2                        │
│                                             │
│  Charts & Graphs:                           │
│  ├─ Hourly ride volume                      │
│  ├─ Revenue by payment method               │
│  ├─ Driver earnings distribution            │
│  ├─ User signup funnel                      │
│  ├─ Conversion rates                        │
│  └─ Churn analysis                          │
│                                             │
│  Tables:                                    │
│  ├─ Top drivers by earnings                 │
│  ├─ Top routes by volume                    │
│  ├─ Customer support issues                 │
│  ├─ Payment failures                        │
│  └─ System errors                           │
│                                             │
│  Filters:                                   │
│  ├─ Date range picker                       │
│  ├─ Region/city filter                      │
│  └─ User segment filter                     │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation (3 weeks)

```typescript
// src/features/admin/AnalyticsDashboard.vue
import { ref, computed } from 'vue';
import * as Charts from 'chart.js';

export default {
  setup() {
    const metrics = ref({
      activeUsers: 0,
      ridesInProgress: 0,
      revenueToday: 0,
      systemHealth: 0,
    });

    const hourlyData = computed(() => {
      // Return hourly ride counts for chart
    });

    const revenueData = computed(() => {
      // Return revenue breakdown by payment method
    });

    onMounted(async () => {
      // Load real-time data every 10 seconds
      setInterval(loadMetrics, 10000);
    });

    async function loadMetrics() {
      const response = await fetch('/api/admin/metrics', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      metrics.value = await response.json();
    }

    return { metrics, hourlyData, revenueData };
  },
};
```

**Timeline:** 3 weeks
**Cost:** $10K
**Tools:** Chart.js, Recharts, or Metabase
**Impact on Rating:** +0.4 (8.4/10)

---

## Gap 5: Automated SMS/Email Reminders (Currently: 1/10)

### Reminder Types

```
Password Reset:
├─ Sent when user clicks "Forgot Password"
├─ Valid for 1 hour
├─ SMS + Email
└─ Example: "Your Wasel reset code: 123456"

Ride Reminders:
├─ 1 hour before ride: "Your ride departs in 1 hour"
├─ 10 minutes before: "Driver arriving in 10 minutes"
├─ After completion: "How was your ride?"
└─ SMS + Push notification

Payment Reminders:
├─ Failed payment: "Your payment failed. Retry?"
├─ Low wallet balance: "Add funds to continue"
├─ Unused credit expiring: "Your credit expires in 3 days"
└─ SMS + Email

Driver Reminders:
├─ Verification pending: "Complete your Sanad verification"
├─ Documents expiring: "Your license expires in 30 days"
├─ Inactive: "You haven't driven in 7 days"
└─ SMS + Email
```

### Implementation (1 week)

```typescript
// src/supabase/functions/make-server-0b1f4071/reminders.ts

import { Twilio } from 'npm:twilio';
import SendGrid from 'npm:@sendgrid/mail';

const twilio = new Twilio(accountSid, authToken);
const sendGrid = SendGrid();

export async function sendRideReminder(userId: string, rideId: string, minutesUntil: number) {
  const user = await getUser(userId);
  
  // SMS
  if (user.phone_number && user.sms_enabled) {
    await twilio.messages.create({
      body: `Your Wasel ride departs in ${minutesUntil} minutes. Driver: ${driverName}`,
      from: TWILIO_NUMBER,
      to: user.phone_number,
    });
  }
  
  // Email
  if (user.email && user.email_enabled) {
    await sendGrid.send({
      to: user.email,
      from: 'noreply@wasel.jo',
      subject: `Your Wasel ride is ready`,
      html: `<p>Your ride departs in ${minutesUntil} minutes...</p>`,
    });
  }
  
  // Push notification
  if (user.push_token) {
    await sendPushNotification(user.push_token, {
      title: 'Ride Reminder',
      body: `Your ride departs in ${minutesUntil} minutes`,
    });
  }
}

// Schedule reminders using Supabase cron
export async function scheduleReminders() {
  // Every minute, check for rides in next 60 minutes
  const upcoming = await getUpcomingRides(minutesUntil: 60);
  
  for (const ride of upcoming) {
    if (ride.minutesUntil === 60) {
      await sendRideReminder(ride.userId, ride.id, 60);
    } else if (ride.minutesUntil === 10) {
      await sendRideReminder(ride.userId, ride.id, 10);
    }
  }
}
```

**Services to Integrate:**
- Twilio: SMS ($0.01 per message)
- SendGrid: Email (free up to 100/day)
- Firebase Cloud Messaging: Push notifications

**Timeline:** 1 week
**Cost:** $500/month (message service)
**Expected Impact:** 25% increase in ride completion
**Impact on Rating:** +0.2 (8.2/10)

---

## Gap 6: Automated Dispute Resolution (Currently: 1/10)

### Dispute Workflow

```
┌─────────────────────────────────────────┐
│  AUTOMATED DISPUTE RESOLUTION           │
├─────────────────────────────────────────┤
│                                         │
│ 1. User reports issue (within 24h)     │
│    └─ Automatically categorize         │
│                                         │
│ 2. Gather evidence                     │
│    ├─ GPS data                         │
│    ├─ Payment records                  │
│    ├─ Ratings                          │
│    └─ Chat history                     │
│                                         │
│ 3. Auto-resolve if clear               │
│    ├─ Lost item: Full refund           │
│    ├─ Wrong charge: Refund difference  │
│    ├─ No-show driver: Full refund      │
│    └─ No-show passenger: Refund 50%   │
│                                         │
│ 4. If unclear: Escalate to human       │
│    ├─ Assign to support specialist     │
│    ├─ Chat with both parties           │
│    └─ Make final decision              │
│                                         │
│ 5. Resolve and close                   │
│    └─ Update wallet automatically      │
│                                         │
└─────────────────────────────────────────┘
```

### Auto-Resolution Rules

```typescript
export class DisputeResolver {
  async resolve(dispute: Dispute): Promise<Resolution | null> {
    // Pattern 1: Payment amount mismatch
    if (dispute.type === 'overcharge') {
      const difference = dispute.chargedAmount - dispute.expectedAmount;
      return {
        action: 'refund',
        amount: difference,
        reason: 'Price mismatch',
      };
    }
    
    // Pattern 2: Driver no-show
    if (dispute.type === 'no_show_driver') {
      const minutesWaited = dispute.waitTimeMinutes;
      if (minutesWaited > 5) {
        return {
          action: 'full_refund',
          amount: dispute.ridePrice,
          reason: 'Driver no-show',
        };
      }
    }
    
    // Pattern 3: Passenger no-show
    if (dispute.type === 'no_show_passenger') {
      if (dispute.driverArrivedOnTime && dispute.passengerNotPresent) {
        return {
          action: 'partial_refund',
          amount: dispute.ridePrice * 0.5,
          reason: 'Passenger no-show',
        };
      }
    }
    
    // No clear pattern: Escalate to human
    return null;
  }
  
  async escalateToHuman(dispute: Dispute) {
    // Create support ticket
    // Assign to specialist
    // Notify both parties
  }
}
```

**Timeline:** 2 weeks
**Cost:** $8K
**Expected Impact:** 80% auto-resolution rate
**Impact on Rating:** +0.3 (8.3/10)

---

## Gap 7: Customer Support Chat (Currently: 0/10)

### Architecture

**Option 1: Intercom (Recommended)**
- Cost: $87/month
- Setup time: 1 day
- Features: Chat, ticket system, bot

**Option 2: Zendesk**
- Cost: $69/month
- Setup time: 2 days
- Features: Chat, ticket, knowledge base

**Option 3: Custom Build**
- Cost: $20K
- Setup time: 2 weeks
- Features: Everything customizable

### Recommended: Intercom Integration

```typescript
// src/plugins/intercom.ts
import IntercomMessenger from '@intercom/messenger-js-sdk';

IntercomMessenger({
  app_id: 'YOUR_INTERCOM_APP_ID',
});

export function startConversation() {
  IntercomMessenger('startConversation');
}

export function setUser(userId: string, userData: UserData) {
  IntercomMessenger('boot', {
    app_id: 'YOUR_INTERCOM_APP_ID',
    user_id: userId,
    email: userData.email,
    name: userData.fullName,
    custom_attributes: {
      phone: userData.phone,
      role: userData.role,
      total_rides: userData.totalRides,
    },
  });
}
```

**Timeline:** 1 week
**Cost:** $87/month
**Expected Impact:** 40% reduction in support emails
**Impact on Rating:** +0.2 (8.2/10)

---

## Summary: Business Gaps Roadmap

| Gap | Priority | Timeline | Cost | Expected Impact |
|-----|----------|----------|------|------------------|
| Compliance | CRITICAL | 6 weeks | $7K-12K | Launch enabler |
| Referral Program | HIGH | 2 weeks | $5K | +30-50% users |
| Promo Codes | HIGH | 1 week | $3K | +15-25% revenue |
| Admin Dashboard | MEDIUM | 3 weeks | $10K | Better ops |
| Automated Reminders | MEDIUM | 1 week | $500/mo | +25% completion |
| Dispute Resolution | MEDIUM | 2 weeks | $8K | +80% auto-resolve |
| Support Chat | LOW | 1 week | $87/mo | Better UX |
| **TOTAL** | - | **16 weeks** | **$33K-38K** | **High growth** |

---

## Go-to-Market Timeline

```
Week 1-2: Compliance + Legal setup
├─ Hire legal firm
├─ Create ToS/Privacy policy
└─ Partner with insurance

Week 2-3: Marketing setup
├─ Create referral program
├─ Setup promo codes
└─ Launch campaign

Week 3-4: Admin tools
├─ Build analytics dashboard
├─ Setup support chat
└─ Train support team

Week 4+: Operations
├─ Monitor metrics
├─ Iterate based on feedback
└─ Scale infrastructure
```

---

**Final Expected Rating: 8.5/10** with all business gaps closed
