import os

import requests

HF_API_KEY = os.environ["HUGGINGFACE_API_KEY"]
LLM_MODEL = os.environ.get("LLM_MODEL", "Qwen/Qwen2.5-7B-Instruct")

_CHAT_URL = "https://router.huggingface.co/v1/chat/completions"


def answer_question(question: str, matches: list[dict]) -> str | None:
    """RAG answer via Hugging Face's hosted chat completions (OpenAI-style
    request/response shape). Falls back to naming the closest match if the
    API call fails or times out — unlike embeddings, a degraded answer here
    is still useful, so this one keeps a fallback.
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

    try:
        response = requests.post(
            _CHAT_URL,
            headers={"Authorization": f"Bearer {HF_API_KEY}"},
            json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception:
        return _extractive_fallback(matches)


def _extractive_fallback(matches: list[dict]) -> str:
    top = matches[0]
    label = top.get("title") or "(untitled)"
    return f'Closest match: "{label}" — submitted by {top["contributor_name"]}'
