"""Start server with Cognito integration."""
import subprocess
import sys
import os

def load_env_file():
    """Load environment variables from .env file."""
    env_file = ".env"
    if os.path.exists(env_file):
        print("Loading environment variables from .env file...")
        with open(env_file, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
        return True
    return False

def check_aws_config():
    """Check if AWS configuration is available."""
    required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'COGNITO_USER_POOL_ID']
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print("[MISSING] AWS configuration:")
        for var in missing:
            print(f"   - {var}")
        print("\nPlease:")
        print("1. Copy .env.example to .env")
        print("2. Fill in your AWS credentials")
        print("3. Run setup_cognito.py to create User Pool (if needed)")
        return False
    
    print("[OK] AWS configuration found")
    return True

def install_dependencies():
    """Install required dependencies."""
    print("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("[OK] Dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the Cognito-enabled server."""
    print("Starting User Management API with Cognito...")
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        env = os.environ.copy()
        env['PYTHONPATH'] = current_dir
        
        subprocess.run([sys.executable, "cognito_server.py"], env=env)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"[FAIL] Failed to start server: {e}")

if __name__ == "__main__":
    print("=== Lazy Vocabulary - Cognito Integration ===\n")
    
    # Load .env file if exists
    load_env_file()
    
    # Check AWS configuration
    if not check_aws_config():
        print("\n[WARNING] Will start with in-memory backend instead.")
        input("Press Enter to continue or Ctrl+C to exit...")
    
    # Install dependencies and start server
    if install_dependencies():
        start_server()
    else:
        print("Cannot start server without dependencies")