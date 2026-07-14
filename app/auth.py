import bcrypt
from fastapi import HTTPException, Request
from psycopg.rows import dict_row

from app.db import pool


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _redirect_to_sign_in(request: Request, sign_in_path: str):
    next_path = request.url.path
    if request.url.query:
        next_path += f"?{request.url.query}"
    raise HTTPException(status_code=303, headers={"Location": f"{sign_in_path}?next={next_path}"})


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
        _redirect_to_sign_in(request, "/auth/sign-in")
    return user


def get_current_contributor(request: Request):
    contributor_id = request.session.get("contributor_id")
    if not contributor_id:
        return None
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, name, team, email, status FROM contributors WHERE id = %s",
                (contributor_id,),
            )
            return cur.fetchone()


def require_contributor(request: Request):
    """Contribute access: an approved contributor, or an admin (admins can
    access everything — see require_auth). Returns a plain dict shaped the
    same way regardless of which one signed in, so callers don't need to
    branch on identity type: {id, name, team, is_admin}.
    """
    admin = get_current_user(request)
    if admin:
        return {"id": None, "name": admin["name"], "team": "Admin", "is_admin": True}

    contributor = get_current_contributor(request)
    if contributor and contributor["status"] == "approved":
        return {
            "id": contributor["id"],
            "name": contributor["name"],
            "team": contributor["team"],
            "is_admin": False,
        }

    _redirect_to_sign_in(request, "/contributor/sign-in")


def safe_next_path(path: str) -> str:
    """Only accept an internal path for post-login redirects — a bare
    `next=https://evil.example` or `next=//evil.example` (protocol-relative,
    still an absolute URL to another host) would otherwise be an open
    redirect once a real login succeeds.
    """
    if path.startswith("/") and not path.startswith("//"):
        return path
    return "/admin/subscribers"
