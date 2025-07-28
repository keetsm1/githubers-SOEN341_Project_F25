from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import ssl

client = AsyncIOMotorClient(
    settings.mongo_uri,
    tls=True,
    tlsAllowInvalidCertificates=True  # For development only!
)
db = client.get_database(settings.db_name)  # Changed from client[settings.DB_NAME]