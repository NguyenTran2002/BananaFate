"""
MongoDB connection and utilities for BananaFate data ingestion.
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def connect_to_mongo():
    """
    Establishes connection to MongoDB Atlas.
    Reads credentials from environment variables.

    Returns:
        MongoClient: Connected MongoDB client

    Raises:
        ValueError: If required credentials are missing
        Exception: If connection fails
    """
    username = os.getenv('username')
    password = os.getenv('password')
    server_address = os.getenv('server_address')

    if not all([username, password, server_address]):
        raise ValueError("Missing MongoDB credentials in environment variables")

    connection_string = f"mongodb+srv://{username}:{password}{server_address}"

    try:
        client = MongoClient(connection_string)
        # Test connection
        client.admin.command('ping')
        print("✅ MongoDB connection established")
        return client
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise

def get_collection(database_name="BananaFate_database", collection_name="banana_images"):
    """
    Get MongoDB collection with connection pooling.

    Args:
        database_name: Name of the database (default: BananaFate_database)
        collection_name: Name of the collection (default: banana_images)

    Returns:
        Collection: MongoDB collection object
    """
    client = connect_to_mongo()
    db = client[database_name]
    return db[collection_name]
