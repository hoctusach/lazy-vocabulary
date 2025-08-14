"""Start the User Management API server."""
import subprocess
import sys
import os

def install_dependencies():
    """Install required dependencies."""
    print("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the FastAPI server."""
    print("Starting User Management API server...")
    try:
        # Add current directory to Python path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        env = os.environ.copy()
        env['PYTHONPATH'] = current_dir
        
        subprocess.run([sys.executable, "server.py"], env=env)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Failed to start server: {e}")

if __name__ == "__main__":
    if install_dependencies():
        start_server()
    else:
        print("Cannot start server without dependencies")