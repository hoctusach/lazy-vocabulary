# DevOps Deployment Plan for Lazy Vocabulary Application (MVP)

## Overview
Deploy minimal MVP version to AWS ap-southeast-2 with $20-25/month budget constraint.

**Configuration:**
- Region: ap-southeast-2
- Backend: In-memory (no database)
- Domain: AWS default URLs
- Deployment: Manual
- Environment: Production only
- Budget: $20-25/month

## Prerequisites Verification
- [ ] **Step 1.1**: Verify AWS CLI installed and configured for ap-southeast-2
- [ ] **Step 1.2**: Verify Node.js >=18 for frontend build
- [ ] **Step 1.3**: Install AWS CDK CLI (`npm install -g aws-cdk`)

## Minimal Infrastructure Setup
- [ ] **Step 2.1**: Create minimal CDK project for cost-optimized deployment
- [ ] **Step 2.2**: Set up AWS Cognito User Pool (free tier)
- [ ] **Step 2.3**: Create single Lambda function for backend API
- [ ] **Step 2.4**: Set up S3 bucket for static hosting (no CloudFront for cost savings)
- [ ] **Step 2.5**: Configure API Gateway with Lambda integration

## Backend Deployment
- [ ] **Step 3.1**: Package Python backend for Lambda (in-memory only)
- [ ] **Step 3.2**: Deploy Lambda function with minimal memory allocation
- [ ] **Step 3.3**: Configure environment variables (Cognito only)
- [ ] **Step 3.4**: Set up API Gateway CORS
- [ ] **Step 3.5**: Test backend endpoints

## Frontend Deployment
- [ ] **Step 4.1**: Update frontend config for production API
- [ ] **Step 4.2**: Build React application (`npm run build`)
- [ ] **Step 4.3**: Deploy to S3 with static website hosting
- [ ] **Step 4.4**: Configure S3 bucket policy for public access

## Testing & Validation
- [ ] **Step 5.1**: Test deployed application end-to-end
- [ ] **Step 5.2**: Validate authentication with Cognito
- [ ] **Step 5.3**: Verify in-memory data persistence during session

## Cost Optimization
- [ ] **Step 6.1**: Configure Lambda with minimal memory (128MB)
- [ ] **Step 6.2**: Set up CloudWatch log retention (7 days)
- [ ] **Step 6.3**: Review and optimize resource allocation

## Estimated Timeline:
- Infrastructure: 1 hour
- Backend deployment: 30 minutes
- Frontend deployment: 30 minutes
- Testing: 30 minutes
- **Total**: 2.5 hours

## Estimated Monthly Cost:
- Lambda (128MB, low usage): ~$1-3
- API Gateway: ~$3-5
- S3 (static hosting): ~$1-2
- Cognito (free tier): $0
- CloudWatch logs: ~$1-2
- **Total**: ~$6-12/month (well within $25 budget)

---

**Starting Step 1.1**: Verifying AWS CLI configuration...