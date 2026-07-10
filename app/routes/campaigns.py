from fastapi import APIRouter, Depends, Form, Request, Response
from psycopg.rows import dict_row

from app.auth import require_auth
from app.db import pool
from app.email_sender import send_email
from app.routes.subscribers import active_subscribers
from app.templating import templates

router = APIRouter(prefix="/admin/campaigns")


@router.get("")
def list_campaigns(request: Request, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
            rows = cur.fetchall()
    return templates.TemplateResponse(request, "campaigns/list.html", {"campaigns": rows})


@router.post("")
def create_campaign(request: Request, subject: str = Form(...), body: str = Form(...), user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "INSERT INTO campaigns (subject, body, created_by) VALUES (%s, %s, %s) RETURNING *",
                (subject, body, user["id"]),
            )
            campaign = cur.fetchone()
    return templates.TemplateResponse(request, "partials/campaign_row.html", {"campaign": campaign})


@router.post("/{campaign_id}/send")
def send_campaign(request: Request, campaign_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM campaigns WHERE id = %s", (campaign_id,))
            campaign = cur.fetchone()
            if campaign is None:
                return Response(status_code=404)

            for subscriber in active_subscribers():
                send_email(subscriber["email"], campaign["subject"], campaign["body"])

            cur.execute(
                "UPDATE campaigns SET status = 'sent', sent_at = now() WHERE id = %s RETURNING *",
                (campaign_id,),
            )
            campaign = cur.fetchone()
    return templates.TemplateResponse(request, "partials/campaign_row.html", {"campaign": campaign})


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        conn.execute("DELETE FROM campaigns WHERE id = %s", (campaign_id,))
    return Response(status_code=200)
