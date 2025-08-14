"""Test server startup and basic functionality."""
import subprocess
import time
import requests
import sys
import os

def start_server():
    """Start the server in background."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env = os.environ.copy()
    env['PYTHONPATH'] = current_dir
    
    # Load .env
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env[key] = value
    
    return subprocess.Popen(
        [sys.executable, "cognito_server.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

def test_endpoints():
    """Test server endpoints."""
    base_url = "http://localhost:8001"
    
    print("Testing server endpoints...")
    
    # Wait for server to start
    for i in range(10):
        try:
            response = requests.get(f"{base_url}/health", timeout=2)
            if response.status_code == 200:
                health_data = response.json()
                print(f"[OK] Health check: {health_data}")
                return True
        except:
            time.sleep(1)
    
    print("[FAIL] Server not responding")
    return False

if __name__ == "__main__":
    print("=== Testing Cognito Server ===\n")
    
    server_process = start_server()
    time.sleep(3)  # Give server time to start
    
    try:
        if test_endpoints():
            print("\n[OK] Server is running with Cognito integration!")
            print("Frontend can now connect to: http://localhost:8001")
        else:
            print("\n[FAIL] Server test failed")
    finally:
        server_process.terminate()
        server_process.wait()