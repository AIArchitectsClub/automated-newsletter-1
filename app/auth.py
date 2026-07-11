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
        next_path = request.url.path
        if request.url.query:
            next_path += f"?{request.url.query}"
        raise HTTPException(status_code=303, headers={"Location": f"/auth/sign-in?next={next_path}"})
    return user


def safe_next_path(path: str) -> str:
    """Only accept an internal path for post-login redirects — a bare
    `next=https://evil.example` or `next=//evil.example` (protocol-relative,
    still an absolute URL to another host) would otherwise be an open
    redirect once a real login succeeds.
    """
    if path.startswith("/") and not path.startswith("//"):
        return path
    return "/admin/subscribers"
