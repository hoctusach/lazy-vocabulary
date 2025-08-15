# Railway Setup Commands

## Step 1: Create New Project
```bash
cd railway-backend
railway login
railway init
```

## Step 2: Deploy
```bash
railway up
```

## Alternative: Create Project in Dashboard
1. Go to railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo" or "Empty Project"
4. If empty project, then run:
```bash
railway link
railway up
```

## Get Your URL
After deployment, Railway will show your app URL:
`https://your-project-name.railway.app`