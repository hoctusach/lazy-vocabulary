@echo off
echo Deploying Lazy Vocabulary Backend to Railway...
echo.

cd src\backend\unified_service

echo Step 1: Initialize git repository...
git init

echo Step 2: Add all files...
git add .

echo Step 3: Commit files...
git commit -m "Deploy backend to Railway"

echo Step 4: Deploy with Railway CLI...
railway login
railway init
railway up

echo.
echo Deployment complete!
echo Check Railway dashboard for your app URL.
pause