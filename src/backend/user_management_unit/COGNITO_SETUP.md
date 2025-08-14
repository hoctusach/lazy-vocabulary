# AWS Cognito Integration Setup

## Prerequisites
1. AWS Account with appropriate permissions
2. AWS CLI configured (optional but recommended)
3. Python dependencies installed

## Quick Setup

### 1. Configure AWS Credentials
```bash
# Option A: Copy and edit environment file
cp .env.example .env
# Edit .env with your AWS credentials

# Option B: Set environment variables directly
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### 2. Create Cognito User Pool
```bash
# Automatic setup (recommended)
python setup_cognito.py

# Manual setup via AWS Console:
# 1. Go to AWS Cognito Console
# 2. Create User Pool
# 3. Configure as shown below
```

### 3. Update Environment Variables
Add the User Pool details to your `.env` file:
```bash
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_client_id_here
```

### 4. Start Server
```bash
python start_cognito_server.py
```

## Manual Cognito Configuration

### User Pool Settings:
- **Pool Name**: `lazy-vocabulary-users`
- **Username**: Email address
- **Password Policy**: Minimum 6 characters
- **Required Attributes**: email, nickname
- **Auto-verify**: email

### App Client Settings:
- **Client Name**: `lazy-vocabulary-client`
- **Auth Flows**: 
  - ADMIN_NO_SRP_AUTH
  - USER_PASSWORD_AUTH
- **Generate Secret**: No

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS Region | `us-east-1` |
| `COGNITO_USER_POOL_ID` | User Pool ID | `us-east-1_123456789` |
| `COGNITO_CLIENT_ID` | App Client ID | `1234567890abcdef` |

## Testing

### 1. Health Check
```bash
curl http://localhost:8001/health
# Should return: {"status": "healthy", "backend": "cognito"}
```

### 2. Register User
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nickname":"TestUser","password":"test123"}'
```

### 3. Login User
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","device_type":"web"}'
```

## Fallback Behavior
If AWS credentials are not configured or invalid:
- Server automatically falls back to in-memory backend
- All functionality works locally for development
- Health check returns: `{"backend": "in-memory"}`

## Security Notes
- User passwords are managed by AWS Cognito
- JWT tokens are signed with configurable secret
- Sessions are tracked separately from Cognito tokens
- Multi-device sessions supported

## Troubleshooting

### Common Issues:

1. **Invalid AWS Credentials**
   ```
   Error: Unable to locate credentials
   ```
   - Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   - Verify IAM permissions for Cognito

2. **User Pool Not Found**
   ```
   Error: User pool does not exist
   ```
   - Run `python setup_cognito.py` to create User Pool
   - Verify COGNITO_USER_POOL_ID is correct

3. **Permission Denied**
   ```
   Error: User is not authorized to perform cognito-idp:AdminCreateUser
   ```
   - Add Cognito permissions to your IAM user/role

### Required IAM Permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminInitiateAuth",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:ListUserPoolClients"
            ],
            "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
        }
    ]
}
```

## Production Deployment
- Use AWS Lambda + API Gateway
- Store JWT secret in AWS Secrets Manager
- Use DynamoDB for session storage
- Enable CloudWatch logging
- Set up proper VPC and security groups