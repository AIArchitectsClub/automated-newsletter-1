import os

import requests

HF_API_KEY = os.environ["HUGGINGFACE_API_KEY"]
LLM_MODEL = os.environ.get("LLM_MODEL", "Qwen/Qwen2.5-7B-Instruct")

_CHAT_URL = "https://router.huggingface.co/v1/chat/completions"

# Backend-side timeout for the HF call. Keep this shorter than the
# frontend's hx-request timeout (see ask.html) so this function's own
# fallback resolves first in the normal case, instead of the browser
# aborting the request out from under us.
_REQUEST_TIMEOUT_SECONDS = 30


def answer_question(question: str, matches: list[dict], history: list[dict] | None = None) -> str | None:
    """RAG answer via Hugging Face's hosted chat completions (OpenAI-style
    request/response shape). Falls back to naming the closest match if the
    API call fails or times out — unlike embeddings, a degraded answer here
    is still useful, so this one keeps a fallback.

    `history` is prior {"question", "answer"} turns from this session,
    threaded in as real chat messages so follow-up questions ("what about
    marketing?") read as continuations rather than one-off queries. Note
    retrieval itself (the `matches` passed in) is still based on the
    current question alone, not the conversation — keeping that simple was
    a deliberate tradeoff; only answer generation is conversation-aware.
    """
    if not matches:
        return None

    context = "\n\n".join(
        f"Title: {m.get('title') or '(untitled)'}\nBy: {m['contributor_name']}\n{m['body']}"
        for m in matches[:5]
    )
    prompt = (
        "Answer the question using only the newsletter submissions below. "
        "If they don't contain the answer, say you don't have that information.\n\n"
        f"Submissions:\n{context}\n\nQuestion: {question}"
    )

    messages = []
    for turn in history or []:
        messages.append({"role": "user", "content": turn["question"]})
        messages.append({"role": "assistant", "content": turn["answer"]})
    messages.append({"role": "user", "content": prompt})

    try:
        response = requests.post(
            _CHAT_URL,
            headers={"Authorization": f"Bearer {HF_API_KEY}"},
            json={"model": LLM_MODEL, "messages": messages, "max_tokens": 300},
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception:
        return _extractive_fallback(matches)


def _extractive_fallback(matches: list[dict]) -> str:
    top = matches[0]
    label = top.get("title") or "(untitled)"
    return f'Closest match: "{label}" — submitted by {top["contributor_name"]}'
