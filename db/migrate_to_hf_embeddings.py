"""One-time migration: switch the submissions.embedding column from
VECTOR(1536) (the old dummy hash-based embedding's width) to VECTOR(384)
(sentence-transformers/all-MiniLM-L6-v2's real width), then re-embed every
existing submission with the real model.

Run once against an existing database that already has the old column.
Fresh databases don't need this — db/schema.sql already creates the
column at the right width.
"""

import os

import psycopg
from dotenv import load_dotenv
from pgvector import Vector
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

load_dotenv()

from app.embeddings import get_embedding  # noqa: E402  (needs .env loaded first)

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    print("Dropping old embedding index/column...")
    conn.execute("DROP INDEX IF EXISTS submissions_embedding_idx")
    conn.execute("ALTER TABLE submissions DROP COLUMN IF EXISTS embedding")
    conn.execute("ALTER TABLE submissions ADD COLUMN embedding VECTOR(384)")
    conn.commit()

    register_vector(conn)

    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("SELECT id, title, body FROM submissions")
        rows = cur.fetchall()

    print(f"Re-embedding {len(rows)} existing submissions via Hugging Face...")
    for row in rows:
        embedding = Vector(get_embedding(f"{row['title']}\n{row['body']}"))
        conn.execute("UPDATE submissions SET embedding = %s WHERE id = %s", (embedding, row["id"]))
        print(f"  embedded: {row['title'] or '(untitled)'}")
    conn.commit()

    print("Rebuilding HNSW index...")
    conn.execute("CREATE INDEX submissions_embedding_idx ON submissions USING hnsw (embedding vector_cosine_ops)")
    conn.commit()

print("Done.")
