def answer_question(question: str, matches: list[dict]) -> str | None:
    """Extractive placeholder answer — names the closest-matching
    submission rather than generating a natural-language answer.

    Swap this for a real LLM call once one is wired up (e.g. a local
    Ollama server running llama3: POST http://localhost:11434/api/generate
    with the question plus `matches`' bodies as context, RAG-style) — every
    call site already goes through this one function. See
    reference/06-qa-llm.md in the build-fullstack-app-python-base skill for
    the swap-in pattern and why self-hosting an LLM changes the deployment
    story.
    """
    if not matches:
        return None
    top = matches[0]
    label = top.get("title") or "(untitled)"
    return f'Closest match: "{label}" — submitted by {top["contributor_name"]}'
