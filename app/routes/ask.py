from fastapi import APIRouter, Depends, Form, Request
from pgvector import Vector
from psycopg.rows import dict_row

from app.auth import require_auth
from app.db import pool
from app.embeddings import get_embedding
from app.qa import answer_question
from app.routes.submissions import _SEARCH_QUERY
from app.templating import templates

router = APIRouter(prefix="/admin/ask")

# Conversation history lives in the signed session cookie (same mechanism
# as auth), which has to stay well under the ~4KB browser cookie limit.
# Cap turn count and truncate stored text accordingly — this only affects
# what's *remembered* for context on later turns; the answer actually
# shown to the browser on the turn it's given is never truncated.
MAX_HISTORY_TURNS = 4
MAX_STORED_QUESTION_CHARS = 200
MAX_STORED_ANSWER_CHARS = 400


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


@router.get("")
def ask_form(request: Request, user=Depends(require_auth)):
    history = request.session.get("qa_history", [])
    return templates.TemplateResponse(request, "ask.html", {"history": history})


@router.post("")
def ask_submit(request: Request, q: str = Form(...), user=Depends(require_auth)):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(_SEARCH_QUERY, (Vector(get_embedding(q)),))
            matches = cur.fetchall()

    history = request.session.get("qa_history", [])
    answer = answer_question(q, matches, history=history) or "I don't have enough information to answer that."

    history.append(
        {"question": _truncate(q, MAX_STORED_QUESTION_CHARS), "answer": _truncate(answer, MAX_STORED_ANSWER_CHARS)}
    )
    request.session["qa_history"] = history[-MAX_HISTORY_TURNS:]

    return templates.TemplateResponse(
        # Only show the single closest submission under the answer — the
        # LLM prompt still sees several matches (see qa.py) for better
        # synthesis, this just trims what's *displayed*.
        request, "partials/qa_turn.html", {"turn": {"question": q, "answer": answer, "matches": matches[:1]}}
    )


@router.post("/clear")
def ask_clear(request: Request, user=Depends(require_auth)):
    request.session["qa_history"] = []
    return templates.TemplateResponse(request, "partials/qa_conversation.html", {"history": []})
