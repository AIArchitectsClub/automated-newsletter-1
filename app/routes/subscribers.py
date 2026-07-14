from fastapi import APIRouter, Depends, Form, Request, Response
from psycopg.rows import dict_row

from app.auth import require_auth
from app.db import pool
from app.templating import templates

router = APIRouter()


def active_subscribers():
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM subscribers WHERE status = 'active'")
            return cur.fetchall()


@router.get("/subscribe")
def subscribe_form(request: Request):
    return templates.TemplateResponse(request, "subscribe.html", {"subscribed": False})


@router.post("/subscribe")
def subscribe(request: Request, name: str = Form(...), email: str = Form(...), team: str = Form(None)):
    with pool.connection() as conn:
        conn.execute(
            """
            INSERT INTO subscribers (email, name, team) VALUES (%s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, team = EXCLUDED.team, status = 'active'
            """,
            (email, name, team),
        )
    return templates.TemplateResponse(request, "subscribe.html", {"subscribed": True})


@router.get("/admin/subscribers")
def list_subscribers(request: Request, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM subscribers ORDER BY subscribed_at")
            rows = cur.fetchall()
    return templates.TemplateResponse(request, "subscribers/list.html", {"subscribers": rows})


@router.delete("/admin/subscribers/{subscriber_id}")
def remove_subscriber(subscriber_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        conn.execute("DELETE FROM subscribers WHERE id = %s", (subscriber_id,))
    return Response(status_code=200)
