CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO subscribers (email, status) VALUES
  ('alice@example.com', 'active'),
  ('bob@example.com', 'active'),
  ('carol@example.com', 'active'),
  ('dave@example.com', 'unsubscribed'),
  ('erin@example.com', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO campaigns (subject, body, status, sent_at)
SELECT 'Welcome to our newsletter', 'Thanks for joining!', 'sent', now()
WHERE NOT EXISTS (SELECT 1 FROM campaigns);

INSERT INTO campaigns (subject, body, status, sent_at)
SELECT 'Monthly update', E'Here''s what''s new this month.', 'draft', NULL
WHERE (SELECT COUNT(*) FROM campaigns) < 2;
