@echo off
echo Creating S3 bucket...
aws s3 mb s3://lazy-vocabulary-app --region ap-southeast-2

echo Enabling static website hosting...
aws s3 website s3://lazy-vocabulary-app --index-document index.html --error-document index.html

echo Setting bucket policy...
echo {^
  "Version": "2012-10-17",^
  "Statement": [^
    {^
      "Sid": "PublicReadGetObject",^
      "Effect": "Allow",^
      "Principal": "*",^
      "Action": "s3:GetObject",^
      "Resource": "arn:aws:s3:::lazy-vocabulary-app/*"^
    }^
  ]^
} > bucket-policy.json

aws s3api put-bucket-policy --bucket lazy-vocabulary-app --policy file://bucket-policy.json

echo Uploading files...
aws s3 sync docs/ s3://lazy-vocabulary-app --delete

echo Deployment complete!
echo Website URL: http://lazy-vocabulary-app.s3-website-ap-southeast-2.amazonaws.com