"""Attempts the automated username/password login for a dedicated X account and
persists the resulting session cookies to disk, so the twitter collector can
reuse them on every future pipeline run without logging in again.

As of 2026, X has retired the plain-HTTP LoginFlow this script drives — login
now requires a real browser (JS-executed anti-bot token + optional passkey/
WebAuthn), which no Python HTTP client can satisfy. This script will very
likely fail with a `LoginRetired`/`InvalidSession` error below; that's
expected, not a bug in this codebase. If it does, use the manual path instead:

  1. Log into X in a normal browser as your dedicated secondary account
     (never your primary — this whole integration is against X's ToS on
     automation and the account can get locked/suspended).
  2. Export x.com's cookies as JSON with a browser extension such as
     "Cookie-Editor" (Chrome/Firefox). twikit's `set_cookies()` accepts that
     export format directly (a list of {name, value, ...} objects).
  3. Save the exported file to the path printed below (`twitter_cookies_path`,
     normally `data/twitter_cookies.json`).

Set TWITTER_USERNAME, TWITTER_EMAIL, TWITTER_PASSWORD in .env first if you
want this script to attempt the automated path anyway.

Usage (from backend/):
    .venv\\Scripts\\python login_twitter.py
"""
from __future__ import annotations

import asyncio

from twikit import Client
from twikit.errors import LoginRetired, TwitterException

from app.config import settings

MANUAL_COOKIE_EXPORT_HELP = """
Automated login failed - this is expected (see this file's docstring): X has
retired the plain-HTTP login flow this script relies on.

Use the manual cookie-export path instead:
  1. Log into x.com in a normal browser as your dedicated secondary account.
  2. Export its cookies as JSON with a browser extension (e.g. "Cookie-Editor").
  3. Save that JSON file to: {path}

The twitter collector will pick it up automatically on the next run - no
further code changes needed.
""".strip()


async def main() -> None:
    if not (settings.twitter_username and settings.twitter_password):
        raise SystemExit(
            "Set TWITTER_USERNAME, TWITTER_EMAIL, TWITTER_PASSWORD in .env first."
        )

    client = Client(language="en-US")
    try:
        await client.login(
            auth_info_1=settings.twitter_username,
            auth_info_2=settings.twitter_email or None,
            password=settings.twitter_password,
        )
    except (LoginRetired, TwitterException) as e:
        print(f"[login_twitter] automated login failed: {type(e).__name__}: {e}\n")
        print(MANUAL_COOKIE_EXPORT_HELP.format(path=settings.twitter_cookies_path))
        raise SystemExit(1) from e

    client.save_cookies(settings.twitter_cookies_path)
    print(f"Logged in. Session cookies saved to {settings.twitter_cookies_path}")
    print("The twitter collector will use these automatically on future runs.")


if __name__ == "__main__":
    asyncio.run(main())
