# Deployment Instructions

## Frontend (S3 - $1-2/month)

### Prerequisites
1. Configure AWS CLI with valid credentials
2. Set region to ap-southeast-2: `aws configure set region ap-southeast-2`

### Deploy
```bash
# Run the deployment script
deploy-s3.bat
```

**Result**: Frontend will be available at:
`http://lazy-vocabulary-app.s3-website-ap-southeast-2.amazonaws.com`

## Backend (Railway - $0/month)

### Prerequisites
1. Create Railway account at railway.app
2. Install Railway CLI: `npm install -g @railway/cli`

### Deploy
```bash
# Login to Railway
railway login

# Navigate to backend folder
cd railway-backend

# Deploy
railway up
```

**Result**: Backend API will be available at:
`https://your-project-name.railway.app`

## Integration

### Update Frontend Config
1. Get your Railway backend URL
2. Update API calls in your React app to use the Railway URL
3. Rebuild and redeploy frontend

### Test
- Frontend: Visit S3 website URL
- Backend: Visit Railway URL + `/docs` for API documentation

## Total Cost: $1-2/month
- S3 hosting: $1-2/month
- Railway backend: $0/month (free tier)
- No database costs (in-memory storage)