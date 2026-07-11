from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from psycopg.rows import dict_row

from app.auth import hash_password, safe_next_path, verify_password
from app.db import pool
from app.templating import templates

router = APIRouter(prefix="/auth")


@router.get("/sign-in")
def sign_in_form(request: Request, next: str = "/admin/subscribers"):
    return templates.TemplateResponse(request, "auth/sign_in.html", {"error": None, "next": next})


@router.post("/sign-in")
def sign_in(request: Request, email: str = Form(...), password: str = Form(...), next: str = Form("/admin/subscribers")):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
    if not user or not verify_password(password, user["password_hash"]):
        return templates.TemplateResponse(
            request, "auth/sign_in.html", {"error": "Invalid email or password", "next": next}, status_code=400
        )
    request.session["user_id"] = str(user["id"])
    return RedirectResponse(safe_next_path(next), status_code=303)


@router.get("/sign-up")
def sign_up_form(request: Request, next: str = "/admin/subscribers"):
    return templates.TemplateResponse(request, "auth/sign_up.html", {"error": None, "next": next})


@router.post("/sign-up")
def sign_up(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    next: str = Form("/admin/subscribers"),
):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return templates.TemplateResponse(
                    request,
                    "auth/sign_up.html",
                    {"error": "That email is already registered", "next": next},
                    status_code=400,
                )
            cur.execute(
                "INSERT INTO users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (email, name, hash_password(password)),
            )
            user = cur.fetchone()
    request.session["user_id"] = str(user["id"])
    return RedirectResponse(safe_next_path(next), status_code=303)


@router.post("/sign-out")
def sign_out(request: Request):
    request.session.clear()
    return RedirectResponse("/subscribe", status_code=303)
