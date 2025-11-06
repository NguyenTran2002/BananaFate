#!/usr/bin/env python3
"""
Generate bcrypt password hash for Banana Fate management portal.

This script takes a plain text password and generates a bcrypt hash
that can be used for authentication in the data management backend.

Usage:
    python3 generate-password-hash.py <password>

Or read from environment variable:
    ADMIN_PASSWORD=mypass python3 generate-password-hash.py

The script outputs only the hash to stdout, making it suitable for
use in shell scripts and deployment automation.
"""

import sys
import os

try:
    import bcrypt
except ImportError:
    print("ERROR: bcrypt module not found", file=sys.stderr)
    print("Install with: pip3 install bcrypt", file=sys.stderr)
    sys.exit(1)


def generate_hash(password: str, rounds: int = 12) -> str:
    """
    Generate bcrypt hash for the given password.

    Args:
        password: Plain text password to hash
        rounds: Number of bcrypt rounds (default: 12)

    Returns:
        Bcrypt hash as a string
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=rounds)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def main():
    # Get password from command line argument or environment variable
    if len(sys.argv) > 1:
        password = sys.argv[1]
    elif 'ADMIN_PASSWORD' in os.environ:
        password = os.environ['ADMIN_PASSWORD']
    else:
        print("ERROR: No password provided", file=sys.stderr)
        print("Usage: python3 generate-password-hash.py <password>", file=sys.stderr)
        print("   or: ADMIN_PASSWORD=mypass python3 generate-password-hash.py", file=sys.stderr)
        sys.exit(1)

    # Validate password
    if not password or len(password) < 1:
        print("ERROR: Password cannot be empty", file=sys.stderr)
        sys.exit(1)

    # Generate and output hash (stdout only, for use in scripts)
    password_hash = generate_hash(password)
    print(password_hash)


if __name__ == '__main__':
    main()
