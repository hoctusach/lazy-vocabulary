"""Quick test of Cognito configuration."""
import os
from infrastructure.aws_config import AWSConfig

def test_config():
    print("=== Testing AWS Cognito Configuration ===\n")
    
    # Load .env file
    if os.path.exists('.env'):
        print("[OK] .env file found")
        with open('.env', 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    else:
        print("[FAIL] .env file not found")
        return
    
    # Test configuration
    config = AWSConfig.from_env()
    print(f"AWS Region: {config.region}")
    print(f"User Pool ID: {config.cognito_user_pool_id}")
    print(f"Has Access Key: {'Yes' if config.access_key_id else 'No'}")
    print(f"Has Secret Key: {'Yes' if config.secret_access_key else 'No'}")
    print(f"Config Valid: {config.is_valid()}")
    
    if config.is_valid():
        print("\n[OK] AWS configuration is valid")
        print("Ready to start Cognito server!")
    else:
        print("\n[FAIL] AWS configuration incomplete")
        print("Please check your .env file")

if __name__ == "__main__":
    test_config()