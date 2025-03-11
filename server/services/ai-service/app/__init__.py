import os
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

# Print a message to confirm environment loading
print(f"Loaded environment variables from {env_path if os.path.exists(env_path) else 'default locations'}")