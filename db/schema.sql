CREATE EXTENSION IF NOT EXISTS vector;

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

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_name TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  embedding VECTOR(1536),
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submission_attachments_submission_idx ON submission_attachments (submission_id);

CREATE INDEX IF NOT EXISTS submissions_embedding_idx ON submissions USING hnsw (embedding vector_cosine_ops);

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
