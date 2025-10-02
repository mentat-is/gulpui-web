FROM node:22-alpine
RUN npm install -g pnpm@latest

WORKDIR /web

COPY --chown=node:node . .

RUN pnpm install

RUN pnpm run build

CMD ["pnpx", "serve", "-s", "build"]
