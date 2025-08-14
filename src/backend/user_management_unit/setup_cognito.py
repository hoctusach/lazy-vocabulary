"""Script to create AWS Cognito User Pool."""
import boto3
from botocore.exceptions import ClientError


def create_user_pool(pool_name: str = "lazy-vocabulary-users", region: str = "us-east-1"):
    """Create a Cognito User Pool for Lazy Vocabulary."""
    cognito = boto3.client('cognito-idp', region_name=region)
    
    try:
        # Create User Pool
        response = cognito.create_user_pool(
            PoolName=pool_name,
            Policies={
                'PasswordPolicy': {
                    'MinimumLength': 6,
                    'RequireUppercase': False,
                    'RequireLowercase': False,
                    'RequireNumbers': False,
                    'RequireSymbols': False
                }
            },
            Schema=[
                {
                    'Name': 'email',
                    'AttributeDataType': 'String',
                    'Required': True,
                    'Mutable': True
                },
                {
                    'Name': 'nickname',
                    'AttributeDataType': 'String',
                    'Required': False,
                    'Mutable': True
                }
            ],
            AutoVerifiedAttributes=['email'],
            UsernameAttributes=['email'],
            UserPoolTags={
                'Application': 'LazyVocabulary',
                'Environment': 'Development'
            }
        )
        
        user_pool_id = response['UserPool']['Id']
        print(f"✅ User Pool created: {user_pool_id}")
        
        # Create User Pool Client
        client_response = cognito.create_user_pool_client(
            UserPoolId=user_pool_id,
            ClientName=f"{pool_name}-client",
            ExplicitAuthFlows=[
                'ADMIN_NO_SRP_AUTH',
                'USER_PASSWORD_AUTH',
                'ALLOW_ADMIN_USER_PASSWORD_AUTH',
                'ALLOW_USER_PASSWORD_AUTH'
            ],
            GenerateSecret=False
        )
        
        client_id = client_response['UserPoolClient']['ClientId']
        print(f"✅ User Pool Client created: {client_id}")
        
        print("\n📋 Add these to your .env file:")
        print(f"COGNITO_USER_POOL_ID={user_pool_id}")
        print(f"COGNITO_CLIENT_ID={client_id}")
        print(f"AWS_REGION={region}")
        
        return user_pool_id, client_id
        
    except ClientError as e:
        print(f"❌ Error creating User Pool: {e}")
        return None, None


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        pool_name = sys.argv[1]
    else:
        pool_name = "lazy-vocabulary-users"
    
    if len(sys.argv) > 2:
        region = sys.argv[2]
    else:
        region = "us-east-1"
    
    print(f"Creating Cognito User Pool: {pool_name} in {region}")
    create_user_pool(pool_name, region)