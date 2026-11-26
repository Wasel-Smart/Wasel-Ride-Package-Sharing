require('dotenv').config();
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

(async () => {
  try {
    const msg = await client.messages.create({
      to: '+18777804236', // replace with real test number
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
