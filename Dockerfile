FROM node:22-alpine

COPY --chown=node:node . ./web

WORKDIR /web

ENV CI=true

# Enable corepack and install dependencies
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install

CMD ["pnpx", "serve", "-s", "build"]
