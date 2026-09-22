"""
Create or promote an admin user.

Usage (from backend/ with venv active):

  set ADMIN_EMAIL=admin@example.com
  set ADMIN_PASSWORD=your-strong-password
  python -m scripts.create_admin

Or:

  python -m scripts.create_admin --email admin@example.com

Password must come from ADMIN_PASSWORD env (never pass via argv in shared logs).

Does not print secrets. Uses the same bcrypt hashing as register/login.
"""

from __future__ import annotations

import argparse
import os
import sys

from app.db import SessionLocal
from app.models.user import User
from app.services.security import hash_password


def create_or_promote_admin(*, email: str, password: str) -> str:
    cleaned = email.lower().strip()
    if not cleaned:
        raise ValueError("email is required")
    if len(password) < 8:
        raise ValueError("password must be at least 8 characters")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == cleaned).one_or_none()
        if user is None:
            user = User(
                email=cleaned,
                password_hash=hash_password(password),
                role="admin",
            )
            db.add(user)
            db.commit()
            return "created"
        user.password_hash = hash_password(password)
        user.role = "admin"
        db.add(user)
        db.commit()
        return "promoted"
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or promote an admin user.")
    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL", "").strip(),
        help="Admin email (or set ADMIN_EMAIL)",
    )
    args = parser.parse_args()
    email = (args.email or "").strip()
    password = os.getenv("ADMIN_PASSWORD") or ""

    if not email:
        print("ERROR: provide --email or ADMIN_EMAIL", file=sys.stderr)
        return 1
    if not password:
        print("ERROR: set ADMIN_PASSWORD in the environment", file=sys.stderr)
        return 1

    try:
        action = create_or_promote_admin(email=email, password=password)
    except Exception as exc:  # noqa: BLE001 — CLI boundary
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(f"Admin user {action} for email={email.lower().strip()} role=admin")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
