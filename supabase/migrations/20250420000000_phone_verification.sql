-- Phone Verification Table
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_phone_verifications_user ON phone_verifications(user_id);
CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_code ON phone_verifications(user_id, phone_number, code) WHERE verified = false;

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY phone_verifications_own ON phone_verifications FOR SELECT USING (user_id = auth.uid());
