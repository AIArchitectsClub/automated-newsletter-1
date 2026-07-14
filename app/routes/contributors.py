from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from psycopg.rows import dict_row

from app.auth import hash_password, require_auth, safe_next_path, verify_password
from app.db import pool
from app.email_sender import send_email
from app.templating import templates

router = APIRouter()


@router.get("/enroll")
def enroll_form(request: Request):
    return templates.TemplateResponse(request, "enroll.html", {"submitted": False, "error": None})


@router.post("/enroll")
def enroll(
    request: Request,
    name: str = Form(...),
    team: str = Form(""),
    email: str = Form(...),
    password: str = Form(...),
):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id FROM contributors WHERE email = %s", (email,))
            if cur.fetchone():
                return templates.TemplateResponse(
                    request,
                    "enroll.html",
                    {"submitted": False, "error": "That email is already registered"},
                    status_code=400,
                )
            cur.execute(
                """
                INSERT INTO contributors (name, team, email, password_hash)
                VALUES (%s, %s, %s, %s)
                """,
                (name, team, email, hash_password(password)),
            )

    return templates.TemplateResponse(request, "enroll.html", {"submitted": True, "error": None})


@router.get("/contributor/sign-in")
def contributor_sign_in_form(request: Request, next: str = "/contribute"):
    return templates.TemplateResponse(request, "contributor/sign_in.html", {"error": None, "next": next})


@router.post("/contributor/sign-in")
def contributor_sign_in(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    next: str = Form("/contribute"),
):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, password_hash, status FROM contributors WHERE email = %s",
                (email,),
            )
            contributor = cur.fetchone()

    if not contributor or not verify_password(password, contributor["password_hash"]):
        return templates.TemplateResponse(
            request,
            "contributor/sign_in.html",
            {"error": "Invalid email or password", "next": next},
            status_code=400,
        )

    if contributor["status"] == "pending":
        return templates.TemplateResponse(
            request,
            "contributor/sign_in.html",
            {"error": "Your enrollment is still under review — you'll be emailed once approved.", "next": next},
            status_code=400,
        )
    if contributor["status"] == "denied":
        return templates.TemplateResponse(
            request,
            "contributor/sign_in.html",
            {"error": "Your enrollment was not approved. Contact the newsletter team for details.", "next": next},
            status_code=400,
        )

    request.session["contributor_id"] = str(contributor["id"])
    return RedirectResponse(safe_next_path(next), status_code=303)


@router.post("/contributor/sign-out")
def contributor_sign_out(request: Request):
    request.session.pop("contributor_id", None)
    return RedirectResponse("/subscribe", status_code=303)


@router.get("/admin/contributors")
def list_contributors(request: Request, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT * FROM contributors
                ORDER BY (status = 'pending') DESC, created_at DESC
                """
            )
            rows = cur.fetchall()
    return templates.TemplateResponse(request, "contributors/list.html", {"contributors": rows})


@router.post("/admin/contributors/{contributor_id}/approve")
def approve_contributor(request: Request, contributor_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE contributors SET status = 'approved', reviewed_at = now()
                WHERE id = %s RETURNING *
                """,
                (contributor_id,),
            )
            contributor = cur.fetchone()

    if contributor:
        send_email(
            contributor["email"],
            "Your newsletter contributor enrollment was approved",
            f"Hi {contributor['name']}, you're approved to contribute — sign in at /contributor/sign-in to get started.",
        )

    return templates.TemplateResponse(request, "partials/contributor_row.html", {"contributor": contributor})


@router.post("/admin/contributors/{contributor_id}/deny")
def deny_contributor(request: Request, contributor_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE contributors SET status = 'denied', reviewed_at = now()
                WHERE id = %s RETURNING *
                """,
                (contributor_id,),
            )
            contributor = cur.fetchone()

    return templates.TemplateResponse(request, "partials/contributor_row.html", {"contributor": contributor})
