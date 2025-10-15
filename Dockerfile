FROM node:20-alpine AS build
WORKDIR /app
ARG _VERSION
ENV APP_VERSION=${_VERSION}
COPY package.json pnpm-lock.yaml* ./
RUN npm i -g pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile; \
COPY . .
RUN node scripts/write-version.js
RUN pnpm run build

FROM nginx:alpine
COPY --from=build /app/build/ /usr/share/nginx/html/
