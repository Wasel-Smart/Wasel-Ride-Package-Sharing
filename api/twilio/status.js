/**
 * Vercel serverless function – Twilio status callback.
 * Twilio will POST URL‑encoded data for each message state change.
 * This handler simply logs the payload and returns a 200 response.
 *
 * Deploy by placing this file under `api/twilio/status.js` – Vercel
 * automatically treats anything in the `api/` folder as a function.
 */

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Twilio sends data as application/x-www-form-urlencoded.
  // Vercel parses it into `req.body` automatically.
  const payload = req.body || {};
  console.log('🔔 Twilio status callback received:', JSON.stringify(payload));

  // TODO: Persist payload to your monitoring / DB solution.
  // Example: send to a Pub/Sub topic, write to a DB, etc.

  // Respond with 200 OK so Twilio knows we processed it.
  res.status(200).send('OK');
};
