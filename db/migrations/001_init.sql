-- Amore Global Travels — pre-booking CRM schema (leads, quotes, messages).
-- ClientEase remains the booking/commission system; clientease_ref is optional and one-way.

CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  email_normalized text NOT NULL,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_normalized, phone_normalized)
);

-- Directory of named agents (not login accounts yet).
CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'agent'
);

CREATE TABLE IF NOT EXISTS trips (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers (id),
  trip_ref text NOT NULL,
  status text NOT NULL,
  progress_status text,
  payment_status text NOT NULL DEFAULT 'not_requested',
  payment_note text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  departure_city text NOT NULL DEFAULT '',
  travel_window text NOT NULL DEFAULT '',
  travelers integer NOT NULL DEFAULT 1,
  budget text NOT NULL DEFAULT '',
  trip_type text NOT NULL DEFAULT 'not_sure',
  trip_style jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences text NOT NULL DEFAULT '',
  preferred_agent text NOT NULL DEFAULT '',
  assigned_agent_id text REFERENCES agents (id),
  selected_quote_id text,
  selected_option_id text,
  clientease_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  proposal jsonb NOT NULL,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS travel_options (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  estimated_price text NOT NULL DEFAULT '',
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  flyer_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  sender_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Placeholder for future R2/S3 objects (flyers, quote PDFs). Not wired yet.
CREATE TABLE IF NOT EXISTS attachments (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  quote_id text REFERENCES quotes (id) ON DELETE SET NULL,
  kind text NOT NULL,
  object_key text NOT NULL,
  filename text NOT NULL,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email_phone
  ON customers (email_normalized, phone_normalized);

CREATE INDEX IF NOT EXISTS idx_trips_updated_at ON trips (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_customer_id ON trips (customer_id);

CREATE INDEX IF NOT EXISTS idx_messages_trip_created ON messages (trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_trip_id ON quotes (trip_id);
CREATE INDEX IF NOT EXISTS idx_travel_options_trip_id ON travel_options (trip_id);
CREATE INDEX IF NOT EXISTS idx_attachments_trip_id ON attachments (trip_id);

-- Named agents from src/lib/agents.ts — data only, not credentials.
INSERT INTO agents (id, name, email, role) VALUES
  ('valerie', 'Valerie Takpor', 'valerie@amoreglobaltravels.com', 'agent'),
  ('jaleeza', 'Jaleeza Smith-Breedlove', 'jaleeza@amoreglobaltravels.com', 'agent'),
  ('alfreda', 'Alfreda Gibson', 'alfreda@amoreglobaltravels.com', 'agent'),
  ('stephanie', 'Stephanie Burney', 'stephanie@amoreglobaltravels.com', 'agent'),
  ('shonya', 'Shonya Morrison', 'shonya@amoreglobaltravels.com', 'agent')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;
