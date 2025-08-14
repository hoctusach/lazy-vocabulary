import boto3
import os

def test_credentials():
    print("Testing AWS credentials...")
    
    # Load from .env manually
    env_vars = {}
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                env_vars[key] = value
    
    access_key = env_vars.get('AWS_ACCESS_KEY_ID')
    secret_key = env_vars.get('AWS_SECRET_ACCESS_KEY')
    region = env_vars.get('AWS_REGION')
    user_pool_id = env_vars.get('COGNITO_USER_POOL_ID')
    client_id = env_vars.get('COGNITO_CLIENT_ID')
    
    print(f"Access Key: {access_key}")
    print(f"Region: {region}")
    print(f"User Pool ID: {user_pool_id}")
    print(f"Client ID: {client_id}")
    
    try:
        # Test basic AWS connection
        client = boto3.client(
            'cognito-idp',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        
        # Test if user pool exists
        response = client.describe_user_pool(UserPoolId=user_pool_id)
        print(f"✓ User Pool found: {response['UserPool']['Name']}")
        
        # Test if client exists
        client_response = client.describe_user_pool_client(
            UserPoolId=user_pool_id,
            ClientId=client_id
        )
        print(f"✓ Client found: {client_response['UserPoolClient']['ClientName']}")
        
        print("All credentials are valid!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        if "security token" in str(e).lower():
            print("Issue: AWS Access Key ID or Secret Access Key is invalid")
        elif "user pool" in str(e).lower():
            print("Issue: COGNITO_USER_POOL_ID is invalid")
        elif "client" in str(e).lower():
            print("Issue: COGNITO_CLIENT_ID is invalid")
        elif "region" in str(e).lower():
            print("Issue: AWS_REGION is invalid")

if __name__ == "__main__":
    test_credentials()