const configuredApiUrl = (process.env.API_URL || process.env.VITE_API_URL || '').trim();
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const functionName = (process.env.VITE_EDGE_FUNCTION_NAME || process.env.EDGE_FUNCTION_NAME || 'make-server-0b1f4071').trim();
const derivedApiUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}` : '';
const apiUrl = (configuredApiUrl || derivedApiUrl).replace(/\/$/, '');
const workerSecret = (process.env.AUTOMATION_WORKER_SECRET || process.env.COMMUNICATION_WORKER_SECRET || '').trim();

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 25;
const backfill = !process.argv.includes('--no-backfill');
const inlineCommunications = process.argv.includes('--inline-communications');

if (!apiUrl) {
  console.error('Set API_URL, VITE_API_URL, or VITE_SUPABASE_URL before running the automation worker.');
  process.exit(1);
}

if (!workerSecret) {
  console.error('Set AUTOMATION_WORKER_SECRET (or COMMUNICATION_WORKER_SECRET) before running the automation worker.');
  process.exit(1);
}

const response = await fetch(`${apiUrl}/automation/process`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-automation-worker-secret': workerSecret,
  },
  body: JSON.stringify({
    limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
    backfill,
    inlineCommunications,
  }),
});

const body = await response.text();

if (!response.ok) {
  console.error(body || `Automation worker failed with HTTP ${response.status}.`);
  process.exit(1);
}

console.log(body);
