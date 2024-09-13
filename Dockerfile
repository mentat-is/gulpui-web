FROM node:20-alpine

COPY --chown=node:node ./web ./web

WORKDIR /web

RUN npm ci

RUN npm run build
