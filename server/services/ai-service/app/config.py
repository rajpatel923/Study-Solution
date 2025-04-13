import os
import logging
import socket
import threading
import time
import json
import requests
from functools import lru_cache

# For Pydantic v2, BaseSettings is in pydantic-settings
from pydantic_settings import BaseSettings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    # App settings
    APP_NAME: str = os.environ.get("APP_NAME", "ai-service")
    APP_VERSION: str = "1.0.0"
    APP_ENVIRONMENT: str = os.environ.get("APP_ENVIRONMENT", "development")
    PORT: int = int(os.environ.get("PORT", "8098"))

    # Eureka settings
    EUREKA_SERVER_URL: str = os.environ.get("EUREKA_SERVER_URL", "http://localhost:8761/eureka")
    ELEVENLABS_API_KEY: str = os.environ.get("ELEVENLABS_API_KEY", "")

    # MongoDB settings
    MONGODB_URI: str = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")
    MONGO_USERNAME: str = os.environ.get("MONGO_USERNAME", "StudySolution")
    MONGO_PASSWORD: str = os.environ.get("MONGO_PASSWORD", "StudySolution")

    # LLM API settings
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    DEFAULT_LLM_MODEL: str = os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")

    # API settings
    API_PREFIX: str = "/api/v1"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore"  # This allows extra fields in the environment
    }


class EurekaClient:
    def __init__(self, settings: Settings):
        self.eureka_server_url = settings.EUREKA_SERVER_URL
        self.app_name = settings.APP_NAME
        self.port = settings.PORT
        self.hostname = socket.gethostname()

        # Get local IP – important when running in Docker
        try:
            self.ip_address = socket.gethostbyname(self.hostname)
        except Exception:
            self.ip_address = "127.0.0.1"

        self.instance_id = f"{self.ip_address}:{self.app_name}:{self.port}"
        self.is_registered = False
        self.heartbeat_thread = None

    def register(self) -> bool:
        """Register service with Eureka server."""
        registration_data = {
            "instance": {
                "instanceId": self.instance_id,
                "hostName": self.ip_address,
                "app": self.app_name.upper(),
                "ipAddr": self.ip_address,
                "status": "UP",
                "port": {"$": self.port, "@enabled": True},
                "securePort": {"$": 443, "@enabled": False},
                "healthCheckUrl": f"http://{self.ip_address}:{self.port}/health",
                "statusPageUrl": f"http://{self.ip_address}:{self.port}/health",
                "homePageUrl": f"http://{self.ip_address}:{self.port}/",
                "dataCenterInfo": {
                    "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
                    "name": "MyOwn"
                },
                "leaseInfo": {
                    "renewalIntervalInSecs": 30,
                    "durationInSecs": 90,
                    "registrationTimestamp": 0,
                    "lastRenewalTimestamp": 0,
                    "evictionTimestamp": 0,
                    "serviceUpTimestamp": 0
                },
                "metadata": {"management.port": str(self.port)},
                "vipAddress": self.app_name,
                "secureVipAddress": self.app_name,
                "isCoordinatingDiscoveryServer": False
            }
        }

        headers = {"Content-Type": "application/json"}
        try:
            response = requests.post(
                f"{self.eureka_server_url}/apps/{self.app_name}",
                data=json.dumps(registration_data),
                headers=headers
            )
            if response.status_code == 204:
                print(f"Successfully registered with Eureka at {self.eureka_server_url}")
                self.is_registered = True
                self._start_heartbeat_thread()
                return True
            else:
                print(f"Failed to register with Eureka. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            print(f"Error registering with Eureka: {str(e)}")
            return False

    def _send_heartbeat(self) -> bool:
        """Send heartbeat to Eureka to maintain registration."""
        try:
            response = requests.put(
                f"{self.eureka_server_url}/apps/{self.app_name}/{self.instance_id}"
            )
            if response.status_code == 200:
                return True
            else:
                print(f"Heartbeat failed. Status: {response.status_code}")
                if not self.is_registered:
                    self.register()
                return False
        except Exception as e:
            print(f"Error sending heartbeat: {str(e)}")
            return False

    def _heartbeat_worker(self):
        """Worker thread to send heartbeats periodically."""
        while self.is_registered:
            self._send_heartbeat()
            time.sleep(30)

    def _start_heartbeat_thread(self):
        """Start a thread for sending heartbeats."""
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_worker)
        self.heartbeat_thread.daemon = True
        self.heartbeat_thread.start()

    def deregister(self):
        """Deregister from Eureka server."""
        if not self.is_registered:
            return
        try:
            response = requests.delete(
                f"{self.eureka_server_url}/apps/{self.app_name}/{self.instance_id}"
            )
            if response.status_code == 200:
                print("Successfully deregistered from Eureka")
            else:
                print(f"Failed to deregister from Eureka. Status: {response.status_code}")
        except Exception as e:
            print(f"Error deregistering from Eureka: {str(e)}")
        self.is_registered = False


@lru_cache()
def get_settings():
    """
    Creates and returns cached application settings.
    """
    return Settings()