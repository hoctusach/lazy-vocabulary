// Production configuration
export const config = {
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-railway-app.railway.app' 
    : 'http://localhost:8000',
  
  AUTH0_DOMAIN: 'your-domain.auth0.com',
  AUTH0_CLIENT_ID: 'your-client-id',
  AUTH0_AUDIENCE: 'lazy-vocabulary-api',
  
  S3_WEBSITE_URL: 'http://lazy-vocabulary-app.s3-website-ap-southeast-2.amazonaws.com'
};