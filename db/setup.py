import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv()

schema = Path(__file__).parent.joinpath("schema.sql").read_text()

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    conn.execute(schema)
    conn.commit()

print("Schema created and seeded.")
