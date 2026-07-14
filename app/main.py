import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.responses import RedirectResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

from app.routes import ask, auth, campaigns, contributors, submissions, subscribers  # noqa: E402

app = FastAPI()
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
    https_only=os.environ.get("ENV") == "production",
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(subscribers.router)
app.include_router(campaigns.router)
app.include_router(auth.router)
app.include_router(contributors.router)
app.include_router(submissions.router)
app.include_router(ask.router)


@app.get("/")
def home():
    return RedirectResponse("/subscribe")
