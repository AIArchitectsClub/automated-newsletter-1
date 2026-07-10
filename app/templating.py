from fastapi.templating import Jinja2Templates

from app.auth import get_current_user


def inject_current_user(request):
    return {"current_user": get_current_user(request)}


templates = Jinja2Templates(directory="app/templates", context_processors=[inject_current_user])
