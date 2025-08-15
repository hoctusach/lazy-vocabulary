@echo off
echo AWS Configuration Setup
echo.
echo Please enter your AWS credentials carefully (no extra spaces):
echo.
aws configure
echo.
echo Testing AWS connection...
aws sts get-caller-identity
echo.
echo If successful, your AWS is ready for S3 deployment!