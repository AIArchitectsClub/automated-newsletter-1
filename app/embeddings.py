import os
import time

import requests

HF_API_KEY = os.environ["HUGGINGFACE_API_KEY"]
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIM = 384

_URL = f"https://router.huggingface.co/hf-inference/models/{EMBEDDING_MODEL}/pipeline/feature-extraction"
_MAX_ATTEMPTS = 3
_RETRY_DELAY_SECONDS = 3


def get_embedding(text: str) -> list[float]:
    """Real semantic embedding via Hugging Face's hosted inference — no
    local model, no torch/sentence-transformers dependency. Returns a flat
    384-dim vector directly (this endpoint already mean-pools to one
    embedding per input; verified by inspecting a live response rather than
    assumed).

    Retries a couple of times on failure: Hugging Face's shared free
    inference tier genuinely cold-starts a model that hasn't been called
    recently, returning a real (not just slow) 500 for ~30s before serving
    requests normally again — confirmed by direct testing, not assumed. A
    longer timeout wouldn't fix this (HF is actively erroring, not just
    slow), but a short retry does, since the pattern is fail, fail, then
    succeed in under a second once warm.

    Still lets a persistent failure propagate rather than falling back to a
    fake vector — a silently-wrong embedding would corrupt semantic search
    results in a way that's much harder to notice than an outright failure.
    """
    last_exception = None
    for attempt in range(_MAX_ATTEMPTS):
        try:
            response = requests.post(
                _URL,
                headers={"Authorization": f"Bearer {HF_API_KEY}"},
                json={"inputs": text},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as exc:
            last_exception = exc
            if attempt < _MAX_ATTEMPTS - 1:
                time.sleep(_RETRY_DELAY_SECONDS)
    raise last_exception
