import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

async function runMigration() {
  const statements = [
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
    `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;`,
    `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS error_message TEXT;`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin ON public.notifications USING GIN(payload);`,
  ];

  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('Migration failed for statement:', sql);
      console.error('Error:', error);
      process.exit(1);
    }
  }

  console.log('Migration applied successfully');
}

runMigration();
