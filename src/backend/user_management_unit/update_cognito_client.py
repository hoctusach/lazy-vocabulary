"""Update Cognito User Pool Client to allow password auth."""
import boto3
import os

# Load .env
if os.path.exists('.env'):
    with open('.env', 'r') as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

def update_client():
    user_pool_id = os.getenv('COGNITO_USER_POOL_ID')
    client_id = os.getenv('COGNITO_CLIENT_ID')
    region = os.getenv('AWS_REGION', 'us-east-1')
    
    cognito = boto3.client('cognito-idp', region_name=region)
    
    try:
        cognito.update_user_pool_client(
            UserPoolId=user_pool_id,
            ClientId=client_id,
            ExplicitAuthFlows=[
                'ADMIN_NO_SRP_AUTH',
                'USER_PASSWORD_AUTH',
                'ALLOW_ADMIN_USER_PASSWORD_AUTH',
                'ALLOW_USER_PASSWORD_AUTH'
            ]
        )
        print("[OK] User Pool Client updated with password auth flows")
    except Exception as e:
        print(f"[FAIL] Update failed: {e}")

if __name__ == "__main__":
    update_client()