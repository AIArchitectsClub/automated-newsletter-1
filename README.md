# Automated Newsletter

FastAPI + Jinja2/HTMX + Neon Postgres newsletter app: a public subscribe
page, and an admin area (behind sign-in) to manage subscribers and
compose/send campaigns.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET, EMAIL_API_KEY
python -m db.setup      # create + seed tables
```

Generate a session secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Run

```bash
uvicorn app.main:app --reload
```

Visit `/subscribe` for the public sign-up page, `/auth/sign-up` to create an
admin account, then `/admin/subscribers` and `/admin/campaigns` to manage
the list and send campaigns.

## Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
```

## Notes

- Campaign sends currently go through a dummy `EMAIL_API_KEY` — see
  `app/email_sender.py`. Swap in a real provider call (Resend/SendGrid/
  Postmark) once a real key is available; every send goes through that one
  function.
- Admin sessions are signed cookies with no server-side revocation — signing
  out clears the local cookie but a copied cookie stays valid until expiry.
