import os

from fastapi.templating import Jinja2Templates

from app.auth import get_current_user

_STYLE_PATH = os.path.join("app", "static", "style.css")


def inject_current_user(request):
    return {"current_user": get_current_user(request)}


def inject_asset_version(request):
    # Cache-busting: browsers aggressively cache a plain /static/style.css
    # URL with no query string, so an edited stylesheet can silently keep
    # serving the old cached copy after a normal reload — exactly the kind
    # of thing that looks like "my CSS changes didn't work" but is really
    # "the browser never re-fetched the file." Tying the query string to
    # the file's own mtime forces a fresh fetch whenever it actually changes,
    # without needing a manual version bump.
    try:
        version = int(os.path.getmtime(_STYLE_PATH))
    except OSError:
        version = 0
    return {"style_version": version}


templates = Jinja2Templates(
    directory="app/templates",
    context_processors=[inject_current_user, inject_asset_version],
)
