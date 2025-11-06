#!/usr/bin/env python3
"""
Quick test script to verify MongoDB Atlas credentials
"""

import sys
from pymongo import MongoClient
from pymongo.errors import OperationFailure, ConfigurationError

# MongoDB configuration from .env
MONGODB_USERNAME = "nguyentran2002work"
MONGODB_PASSWORD = "gjnfxmkfxrjl52c6hvgh"
MONGODB_CLUSTER = "personal.0df18ni.mongodb.net"
MONGODB_DATABASE = "BananaFate_database"

# Construct MongoDB connection string
MONGODB_URI = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@{MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName=BananaFate"

print("Testing MongoDB Atlas connection...")
print(f"Cluster: {MONGODB_CLUSTER}")
print(f"Database: {MONGODB_DATABASE}")
print(f"Username: {MONGODB_USERNAME}")
print()

try:
    # Create MongoDB client
    print("Connecting to MongoDB...")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)

    # Test connection by pinging
    print("Sending ping command...")
    client.admin.command('ping')
    print("✅ Ping successful!")

    # Try to access the database
    print(f"\nAccessing database '{MONGODB_DATABASE}'...")
    db = client[MONGODB_DATABASE]

    # List collections
    print("Listing collections...")
    collections = db.list_collection_names()
    print(f"✅ Found {len(collections)} collection(s): {collections}")

    # Try to query the banana_images collection
    if "banana_images" in collections:
        print("\nTesting query on 'banana_images' collection...")
        collection = db["banana_images"]
        count = collection.count_documents({})
        print(f"✅ Collection has {count} document(s)")

        # Try to find one document
        sample = collection.find_one()
        if sample:
            print(f"✅ Successfully read a document. Sample fields: {list(sample.keys())}")
        else:
            print("ℹ️  Collection is empty")

    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED - MongoDB credentials are working!")
    print("="*60)

except OperationFailure as e:
    print("\n" + "="*60)
    print("❌ AUTHENTICATION FAILED")
    print("="*60)
    print(f"Error: {e}")
    print("\nThis means the username/password combination is incorrect.")
    print("Please check the credentials in .env file.")
    sys.exit(1)

except ConfigurationError as e:
    print("\n" + "="*60)
    print("❌ CONFIGURATION ERROR")
    print("="*60)
    print(f"Error: {e}")
    print("\nThis means there's an issue with the connection string or cluster address.")
    sys.exit(1)

except Exception as e:
    print("\n" + "="*60)
    print(f"❌ UNEXPECTED ERROR: {type(e).__name__}")
    print("="*60)
    print(f"Error: {e}")
    sys.exit(1)

finally:
    if 'client' in locals():
        client.close()
        print("\nConnection closed.")
