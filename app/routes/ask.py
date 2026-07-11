from fastapi import APIRouter, Depends, Request
from pgvector import Vector
from psycopg.rows import dict_row

from app.auth import require_auth
from app.db import pool
from app.embeddings import get_embedding
from app.qa import answer_question
from app.routes.submissions import _SEARCH_QUERY
from app.templating import templates

router = APIRouter(prefix="/admin/ask")


@router.get("")
def ask_form(request: Request, user=Depends(require_auth)):
    return templates.TemplateResponse(request, "ask.html", {"answer": None, "matches": [], "asked": False})


@router.get("/answer")
def ask_answer(request: Request, q: str = "", user=Depends(require_auth)):
    matches = []
    asked = bool(q.strip())
    if asked:
        with pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(_SEARCH_QUERY, (Vector(get_embedding(q)),))
                matches = cur.fetchall()
    answer = answer_question(q, matches)
    return templates.TemplateResponse(
        request, "partials/qa_results.html", {"answer": answer, "matches": matches, "asked": asked}
    )
