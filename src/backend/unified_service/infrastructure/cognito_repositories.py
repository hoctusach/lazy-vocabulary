"""AWS Cognito repository implementations."""
import boto3
from typing import Optional, List
from botocore.exceptions import ClientError

from domain.entities import User, UserSession
from domain.value_objects import UserId, SessionId, Email, Nickname
from domain.repositories import UserRepository, SessionRepository


class CognitoUserRepository(UserRepository):
    def __init__(self, user_pool_id: str, region: str = 'us-east-1'):
        self.user_pool_id = user_pool_id
        self.cognito = boto3.client('cognito-idp', region_name=region)
    
    def find_by_email(self, email: Email) -> Optional[User]:
        try:
            response = self.cognito.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=email.value
            )
            return self._map_cognito_user(response)
        except ClientError:
            return None
    
    def find_by_id(self, user_id: UserId) -> Optional[User]:
        try:
            response = self.cognito.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=user_id.value
            )
            return self._map_cognito_user(response)
        except ClientError:
            return None
    
    def save(self, user: User) -> None:
        try:
            self.cognito.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=user.email.value,
                UserAttributes=[
                    {'Name': 'email', 'Value': user.email.value},
                    {'Name': 'nickname', 'Value': user.nickname.value}
                ],
                MessageAction='SUPPRESS'
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'UsernameExistsException':
                raise
    
    def exists_by_email(self, email: Email) -> bool:
        return self.find_by_email(email) is not None
    
    def authenticate(self, email: Email, password: str) -> Optional[dict]:
        try:
            response = self.cognito.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self._get_client_id(),
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': email.value,
                    'PASSWORD': password
                }
            )
            return response.get('AuthenticationResult')
        except ClientError as e:
            print(f"Cognito auth error: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
            return None
    
    def _map_cognito_user(self, cognito_response) -> User:
        attributes = {attr['Name']: attr['Value'] for attr in cognito_response['UserAttributes']}
        return User(
            user_id=UserId.generate(),
            email=Email(attributes['email']),
            nickname=Nickname(attributes.get('nickname', attributes['email'].split('@')[0])),
            created_at=cognito_response['UserCreateDate'],
            last_login_at=cognito_response.get('UserLastModifiedDate'),
            is_active=cognito_response['UserStatus'] == 'CONFIRMED'
        )
    
    def _get_client_id(self) -> str:
        # Get the first app client for the user pool
        response = self.cognito.list_user_pool_clients(UserPoolId=self.user_pool_id)
        return response['UserPoolClients'][0]['ClientId']