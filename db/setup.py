from pathlib import Path

from app.db import pool

schema = Path(__file__).parent.joinpath("schema.sql").read_text()

with pool.connection() as conn:
    conn.execute(schema)

print("Schema created and seeded.")
pool.close()
