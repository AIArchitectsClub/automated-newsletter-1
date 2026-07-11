import os

from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]


def _configure(conn):
    register_vector(conn)


pool = ConnectionPool(conninfo=DATABASE_URL, min_size=1, max_size=5, open=True, configure=_configure)
