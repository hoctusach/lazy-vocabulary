@echo off
echo Deploying locally to Railway (no code push)...
cd src\backend\unified_service

echo Installing Railway CLI...
npm install -g @railway/cli

echo Logging into Railway...
railway login

echo Creating new project...
railway init

echo Deploying directly from local files...
railway up

echo Done! Check Railway dashboard for your URL.
pause