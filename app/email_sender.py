import os

EMAIL_API_KEY = os.environ.get("EMAIL_API_KEY", "dummy-key")


def send_email(to: str, subject: str, body: str) -> None:
    """Dummy sender — no real provider configured yet.

    Swap this for a real call (Resend/SendGrid/Postmark, keyed off
    EMAIL_API_KEY) once a real key is available; every call site already
    goes through this one function.
    """
    print(f"[dummy email] to={to} subject={subject!r} key=...{EMAIL_API_KEY[-4:]}")
