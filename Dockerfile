FROM node:20-alpine

COPY --chown=node:node . ./web

WORKDIR /web

RUN npm install

RUN npm run build

RUN npm install -g serve

CMD ["npx", "serve", "-s", "build"]
