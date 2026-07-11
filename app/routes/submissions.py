from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile
from pgvector import Vector
from psycopg.rows import dict_row

from app.auth import require_auth
from app.db import pool
from app.embeddings import get_embedding
from app.templating import templates

router = APIRouter()

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024

_ATTACHMENTS_JOIN = """
    FROM submissions s
    LEFT JOIN submission_attachments a ON a.submission_id = s.id
    GROUP BY s.id
"""
_ATTACHMENTS_AGG = """
    COALESCE(
        json_agg(
            json_build_object('id', a.id, 'filename', a.filename, 'content_type', a.content_type)
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
    ) AS attachments
"""
_LIST_QUERY = f"SELECT s.*, {_ATTACHMENTS_AGG} {_ATTACHMENTS_JOIN} ORDER BY s.created_at DESC"
_SEARCH_QUERY = f"""
    SELECT s.*, (s.embedding <=> %s) AS distance, {_ATTACHMENTS_AGG}
    {_ATTACHMENTS_JOIN}
    ORDER BY distance ASC
    LIMIT 15
"""


@router.get("/contribute")
def contribute_form(request: Request):
    return templates.TemplateResponse(request, "contribute.html", {"submitted": False, "error": None})


@router.post("/contribute")
def contribute(
    request: Request,
    contributor_name: str = Form(...),
    team: str = Form(""),
    title: str = Form(""),
    body: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    attachments = []
    for f in files:
        if not f.filename:
            continue
        contents = f.file.read()
        is_video = bool(f.content_type and f.content_type.startswith("video/"))
        limit = MAX_VIDEO_BYTES if is_video else MAX_FILE_BYTES
        if len(contents) > limit:
            return templates.TemplateResponse(
                request,
                "contribute.html",
                {
                    "submitted": False,
                    "error": f"{f.filename} is too large (limit {limit // (1024 * 1024)}MB)",
                },
                status_code=400,
            )
        attachments.append((f.filename, f.content_type or "application/octet-stream", contents))

    embedding = Vector(get_embedding(f"{title}\n{body}"))

    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO submissions (contributor_name, team, title, body, embedding)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
                """,
                (contributor_name, team, title, body, embedding),
            )
            submission = cur.fetchone()
            for filename, content_type, contents in attachments:
                cur.execute(
                    """
                    INSERT INTO submission_attachments (submission_id, filename, content_type, size_bytes, data)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (submission["id"], filename, content_type, len(contents), contents),
                )

    return templates.TemplateResponse(request, "contribute.html", {"submitted": True, "error": None})


@router.get("/admin/submissions")
def list_submissions(request: Request, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(_LIST_QUERY)
            rows = cur.fetchall()
    return templates.TemplateResponse(request, "submissions/list.html", {"submissions": rows})


@router.get("/admin/submissions/search")
def search_submissions(request: Request, q: str = "", user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            if q.strip():
                cur.execute(_SEARCH_QUERY, (Vector(get_embedding(q)),))
            else:
                cur.execute(_LIST_QUERY)
            rows = cur.fetchall()
    return templates.TemplateResponse(request, "partials/submission_results.html", {"submissions": rows})


@router.get("/admin/submissions/{submission_id}/attachments/{attachment_id}")
def get_attachment(submission_id: str, attachment_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT filename, content_type, data FROM submission_attachments WHERE id = %s AND submission_id = %s",
                (attachment_id, submission_id),
            )
            row = cur.fetchone()
    if row is None:
        return Response(status_code=404)
    return Response(content=bytes(row["data"]), media_type=row["content_type"])


@router.delete("/admin/submissions/{submission_id}")
def delete_submission(submission_id: str, user=Depends(require_auth)):
    with pool.connection() as conn:
        conn.execute("DELETE FROM submissions WHERE id = %s", (submission_id,))
    return Response(status_code=200)
