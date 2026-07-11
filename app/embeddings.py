import os

import requests

HF_API_KEY = os.environ["HUGGINGFACE_API_KEY"]
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIM = 384

_URL = f"https://router.huggingface.co/hf-inference/models/{EMBEDDING_MODEL}/pipeline/feature-extraction"


def get_embedding(text: str) -> list[float]:
    """Real semantic embedding via Hugging Face's hosted inference — no
    local model, no torch/sentence-transformers dependency. Returns a flat
    384-dim vector directly (this endpoint already mean-pools to one
    embedding per input; verified by inspecting a live response rather than
    assumed).

    Lets errors propagate rather than falling back to a fake vector — a
    silently-wrong embedding would corrupt semantic search results in a way
    that's much harder to notice than an outright failure.
    """
    response = requests.post(
        _URL,
        headers={"Authorization": f"Bearer {HF_API_KEY}"},
        json={"inputs": text},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()
