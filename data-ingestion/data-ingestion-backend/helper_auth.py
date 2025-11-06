"""
Authentication utilities for BananaFate data management.
Handles password verification and JWT token generation.
"""

import bcrypt
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Secret key for JWT signing (stored in environment variable)
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 8

# Management password hash (stored in environment variable)
# Default hash is for password "admin123" - CHANGE IN PRODUCTION!
MANAGEMENT_PASSWORD_HASH = os.getenv(
    'MANAGEMENT_PASSWORD_HASH',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5OMGtQB3CuRjO'  # "admin123"
)

def verify_password(password: str) -> bool:
    """
    Verify password against stored hash.

    Args:
        password: Plain text password to verify

    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        password_bytes = password.encode('utf-8')
        hash_bytes = MANAGEMENT_PASSWORD_HASH.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def generate_token(payload: dict = None) -> str:
    """
    Generate JWT token for authenticated session.

    Args:
        payload: Optional additional claims to include in token

    Returns:
        str: Encoded JWT token
    """
    if payload is None:
        payload = {}

    # Add expiration time
    payload['exp'] = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload['iat'] = datetime.utcnow()
    payload['type'] = 'management_access'

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def verify_token(token: str) -> dict:
    """
    Verify and decode JWT token.

    Args:
        token: JWT token to verify

    Returns:
        dict: Decoded token payload

    Raises:
        jwt.ExpiredSignatureError: If token has expired
        jwt.InvalidTokenError: If token is invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise jwt.ExpiredSignatureError("Token has expired")
    except jwt.InvalidTokenError:
        raise jwt.InvalidTokenError("Invalid token")

def hash_password(password: str) -> str:
    """
    Hash a password for storage (utility function for generating new hashes).

    Args:
        password: Plain text password to hash

    Returns:
        str: Bcrypt hash string
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')
