import bcrypt
from fastapi import HTTPException, Request
from psycopg.rows import dict_row

from app.db import pool


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def get_current_user(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, email, name FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()


def require_auth(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=303, headers={"Location": "/auth/sign-in"})
    return user
