"""
reset_users.py
Run this once to delete users.json and recreate it with fresh bcrypt hashes.

Usage:
    python reset_users.py
"""
import os
import json
from passlib.context import CryptContext

pwd_ctx    = CryptContext(schemes=["bcrypt"], deprecated="auto")
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")

# Delete old file if it exists
if os.path.exists(USERS_FILE):
    os.remove(USERS_FILE)
    print(f"Deleted old: {USERS_FILE}")

# Create fresh hashed users
users = {
    "admin": pwd_ctx.hash("admin123"),
    "demo":  pwd_ctx.hash("demo123"),
}

with open(USERS_FILE, "w", encoding="utf-8") as f:
    json.dump(users, f, indent=2)

print(f"Created fresh users.json at: {USERS_FILE}")
print("Users created:")
for u in users:
    print(f"  username: {u}  |  hash: {users[u][:20]}...")
print("\nYou can now login with:")
print("  admin / admin123")
print("  demo  / demo123")
