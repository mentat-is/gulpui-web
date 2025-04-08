FROM node:22-alpine

COPY --chown=node:node . ./web

WORKDIR /web

RUN npm install -g serve

RUN npm install

RUN npm run build

CMD ["npx", "serve", "-s", "build"]
