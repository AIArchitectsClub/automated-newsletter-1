import hashlib
import os

EMBEDDING_API_KEY = os.environ.get("EMBEDDING_API_KEY", "dummy-key")
EMBEDDING_DIM = 1536


def get_embedding(text: str) -> list[float]:
    """Dummy embedding — a deterministic pseudo-vector derived from a hash
    of the text, not a real semantic embedding.

    Swap this for a real provider call (OpenAI text-embedding-3-small,
    Cohere, Voyage, etc., keyed off EMBEDDING_API_KEY) once a real key is
    available; every call site already goes through this one function.
    Keeping EMBEDDING_DIM at 1536 now (OpenAI's text-embedding-3-small
    size) avoids a column width change later — the pgvector column is
    declared VECTOR(1536) to match.

    Same text always hashes to the same vector, so exact/near-duplicate
    text will correctly show up as closest matches in search — enough to
    prove the storage/query plumbing end to end, but not real semantic
    similarity between different wording of the same idea.
    """
    digest = hashlib.sha256(text.encode()).digest()
    values = [(b / 127.5) - 1 for b in digest]
    repeated = (values * (EMBEDDING_DIM // len(values) + 1))[:EMBEDDING_DIM]
    return repeated
