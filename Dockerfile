# syntax = docker/dockerfile:1.2
FROM node:20-buster
# Create app directory
WORKDIR /usr/src/app

ARG SENTRY_AUTH_TOKEN 

# Install app dependencies
COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn ./.yarn


RUN yarn install --immutable

COPY . .

RUN yarn generate
RUN --mount=type=secret,id=sentry_auth_token yarn build 




CMD [ "yarn", "start" ]