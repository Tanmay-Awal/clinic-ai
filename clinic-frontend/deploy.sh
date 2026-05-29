#!/bin/bash
set -e

AWSPROFILE="$1"
ACCOUNT_ID="$2"
REGION="$3"
USER="$4"
SERVER="$5"

DIR="voice_website_dev"
SUBDOMAIN="voicedev"
CONTAINER="voice_website_dev"
BRANCH="dev"

if [ "$SERVER" = "prod" ]; then
  DIR="voice_website"
  SUBDOMAIN="voicedev"
  CONTAINER="voice_website"
  BRANCH="main"
fi

git switch $BRANCH

git pull

export AWS_PROFILE=$AWSPROFILE

docker buildx build \
  --platform linux/amd64 \
  -t $CONTAINER \
  .

docker images | grep $CONTAINER

aws ecr get-login-password --region $REGION --profile $AWS_PROFILE \
| docker login \
  --username AWS \
  --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

docker tag $CONTAINER:latest \
  $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$CONTAINER:latest

docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$CONTAINER:latest

ssh voice_suite << EOF
  sudo su "$USER"
  cd /opt/"$DIR"
  export IMAGE_TAG=latest
  ./deploy.sh
EOF

echo "Deployment complete!" 

sleep 5

curl  -A "VoiceSuite HealthCheck/1.0" "https://$SUBDOMAIN.huemanai.co.uk/health"