-- OTP logins, quote PDF url in jsonb, extra indexes for inbox/thread.

CREATE TABLE IF NOT EXISTS login_otps (
  id text PRIMARY KEY,
  purpose text NOT NULL,
  email_normalized text NOT NULL,
  phone_normalized text,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_otps_lookup
  ON login_otps (purpose, email_normalized, expires_at);

CREATE INDEX IF NOT EXISTS idx_quotes_trip_created
  ON quotes (trip_id, created_at);

CREATE INDEX IF NOT EXISTS idx_attachments_object_key
  ON attachments (object_key);
