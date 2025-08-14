"""AWS configuration management."""
import os
from dataclasses import dataclass


@dataclass
class AWSConfig:
    access_key_id: str
    secret_access_key: str
    region: str
    cognito_user_pool_id: str
    cognito_client_id: str = ""
    
    @classmethod
    def from_env(cls) -> 'AWSConfig':
        return cls(
            access_key_id=os.getenv('AWS_ACCESS_KEY_ID', ''),
            secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY', ''),
            region=os.getenv('AWS_REGION', 'us-east-1'),
            cognito_user_pool_id=os.getenv('COGNITO_USER_POOL_ID', ''),
            cognito_client_id=os.getenv('COGNITO_CLIENT_ID', '')
        )
    
    def is_valid(self) -> bool:
        return bool(
            self.access_key_id and 
            self.secret_access_key and 
            self.cognito_user_pool_id
        )


def setup_aws_credentials(config: AWSConfig) -> None:
    """Set up AWS credentials in environment."""
    os.environ['AWS_ACCESS_KEY_ID'] = config.access_key_id
    os.environ['AWS_SECRET_ACCESS_KEY'] = config.secret_access_key
    os.environ['AWS_DEFAULT_REGION'] = config.region