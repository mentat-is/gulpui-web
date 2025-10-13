FROM node:20-alpine AS build
WORKDIR /app

ARG _VERSION=dev
ENV APP_VERSION=${_VERSION}

COPY package.json pnpm-lock.yaml* ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=build /app/build/ /usr/share/nginx/html/
