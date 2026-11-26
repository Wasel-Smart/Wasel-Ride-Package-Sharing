# Production‑Ready Twilio SMS Setup

This repository now contains everything you need to run a **production‑grade** Twilio SMS service.

---

## 📋 Checklist (All ✅ = production ready)

| ✅ Item | Description | How to verify |
|--------|-------------|---------------|
| **A. Account credentials** | Store `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in a secret manager or a local `.env` file (excluded from Git). | `printenv | grep TWILIO` shows the variables on the host only. |
| **B. Domain verification** | Add a TXT record `_twilio` with value `twilio-domain-verification=...` to your DNS. | `nslookup -type=TXT _twilio.your-domain.com` returns the value. |
| **C. Phone numbers** | Purchase / verify a Twilio number that can send SMS and enable the *Messaging* capability. | In the Twilio Console → **Phone Numbers → Manage → Active Numbers** → SMS toggle ON. |
| **D. (Optional) Messaging Service** | Create a Messaging Service, attach your number(s), enable *Sticky Sender* / *Geo‑Match* if needed. | Service status = **Active** in the Console. |
| **E. Auth‑token rotation** | Regenerate the Auth Token, update every reference (env file, secret manager, CLI login). | Any API call returns `200` – no `401 Unauthorized`. |
| **F. Status‑callback webhook** | Deploy the Vercel serverless function at `https://<domain>/api/twilio/status` and set it as the **Status Callback URL** for your number or per‑message. | Twilio Console → **Phone Numbers → Messaging → A Message Comes In** → URL points to `/api/twilio/status`. |
| **G. Opt‑out handling** | Twilio automatically processes `STOP/START` commands. Add custom logic if you need extra handling. | Sending `STOP` to the number returns the standard unsubscribe reply. |
| **H. Rate limiting / throttling** | Configure limits in the Messaging Service **Rate Limits** tab or implement your own queue. | No `429 Too Many Requests` errors in production logs. |
| **I. Production test** | Send a real SMS to a verified handset and confirm delivery. | Twilio Console shows **Delivered** and the handset receives the message. |
| **J. Monitoring & alerts** | Enable Twilio alerts (email / Slack) for delivery failures, and set up your own health‑check endpoint. | Simulate a failure (invalid `To`) → you receive an alert. |
| **K. Secrets management** | Keep the SID & token in Azure Key Vault, GCP Secret Manager, AWS Secrets Manager, or a `.env` file excluded via `.gitignore`. | Verify that the secrets are not present in the repository. |
| **L. Documentation** | Keep this README, a run‑book, and environment‑template files up‑to‑date. | Run‑book stored in the repo (`README-Production-Twilio.md`). |

When every row is ✅, the Twilio SMS pipeline is **100 % production‑ready**.

---

## 🛠️ Files added for production

| File | Purpose |
|------|---------|
| `.env.example` | Template for the required environment variables (keep out of VCS). |
| `api/twilio/status.js` | Vercel serverless function that receives Twilio status callbacks. |
| `scripts/send_sms.js` | Simple Node script (uses the Twilio SDK) to send a test SMS. |
| `README-Production-Twilio.md` | This checklist and run‑book (you are reading it!). |

---

## ⚙️ Environment template (`.env.example`)

```dotenv
# Twilio credentials – store these securely!
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_new_auth_token_here

# Your verified "From" number (E.164 format)
TWILIO_FROM=+17407465173

# Optional – Messaging Service SID (if you created one)
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# HTTPS endpoint that Twilio will call with delivery status updates
TWILIO_STATUS_CALLBACK=https://your‑domain.com/api/twilio/status
```

Copy the file to `.env` (or inject the values into your secret manager) **before you start the service**.

---

## 🚀 Deploying the webhook on Vercel

1. **Add the `api/twilio/status.js` file** (already present in the repo). Vercel automatically treats anything under `api/` as a serverless function.
2. **Configure the domain** in Vercel to match the one you verified in Twilio.
3. In the Twilio Console, set **Status Callback URL** to the URL that Vercel creates, e.g.:
   ```
   https://your‑domain.com/api/twilio/status
   ```
4. Deploy the project (`vercel deploy` or via the Vercel dashboard).
5. Test the endpoint by sending an SMS (see the script below) – you should see a `200 OK` response in Vercel logs.

---

## 📤 Test script (`scripts/send_sms.js`)

```javascript
require('dotenv').config();
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

(async () => {
  try {
    const msg = await client.messages.create({
      to: '+18777804236', // <-- change to a real test number
      ...(process.env.TWILIO_MESSAGING_SERVICE_SID
        ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
        : { from: process.env.TWILIO_FROM }),
      body: `واصل | رمز التحقق الخاص بك هو {{1}}
استخدم هذا الرمز لتأكيد حسابك في واصل. تنتهي صلاحيته خلال 5 دقائق.
لا تشارك هذا الرمز مع أي شخص.
أهلاً بك في واصل!`,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK,
    });
    console.log('✅ Sent – SID:', msg.sid);
  } catch (e) {
    console.error('❌ Error sending SMS:', e.message);
    process.exit(1);
  }
})();
```

Run it locally (after you have a `.env` file):
```bash
npm i twilio dotenv
node scripts/send_sms.js
```
You should see `✅ Sent – SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` and the recipient will receive the Arabic message.

---

## 📈 Monitoring & alerts

* **Twilio alerts** – enable *Message Delivery Failures* in **Console → Monitor → Alerts** (email or Slack).  
* **Vercel logs** – check the function logs for each POST request (`/api/twilio/status`).  
* **Health check** – you can add a simple `GET /api/twilio/health` endpoint that returns `200` to let your uptime monitor know the webhook is up.

---

## 🗝️ Rotating the Auth Token (future proof)

1. Go to **Twilio Console → Account → API Keys & Tokens** → **Regenerate Auth Token**.
2. Update the value in your secret store (`az keyvault secret set …`, `aws secretsmanager update‑secret`, etc.) or replace the line in `.env`.
3. Restart any services that load the token (Vercel will automatically pick up the new secret on the next deploy).
4. Verify by sending a test SMS – you should get a `200` response.

---

## 📚 Additional resources
- Twilio Docs – [SMS Messaging Overview](https://www.twilio.com/docs/sms)
- Vercel Docs – [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- Security – [Best practices for storing API secrets](https://www.twilio.com/docs/usage/secure-credentials)

---

**All production steps are now codified.**

> **Next actions for you**
> 1. Create the real `.env` (or load the secrets into your cloud secret manager).
> 2. Deploy to Vercel (or your preferred host).
> 3. Verify DNS TXT record for `_twilio`.
> 4. Run `node scripts/send_sms.js` to confirm end‑to‑end delivery.
> 5. Enable Twilio alerts and monitor the webhook logs.

When those actions are completed, the Twilio integration will be **100 % ready for production**.
```