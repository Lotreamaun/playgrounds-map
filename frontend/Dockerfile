# build-этап: сборка Vite
FROM node:lts-alpine AS build

WORKDIR /app

# Публичные ключи Яндекса и API base передаются как build-args.
# Дефолты совпадают с закоммиченным .env.production; заданные в панели Dockhost build-args их переопределяют.
ARG VITE_API_BASE_URL=""
ARG VITE_YANDEX_MAPS_KEY=a777c097-a5ec-4c58-b9a9-e23f94bfd245
ARG VITE_YANDEX_GEOCODER_KEY=a6a9006b-a9a8-48b9-ae46-009f99c6cb84
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_YANDEX_MAPS_KEY=$VITE_YANDEX_MAPS_KEY \
    VITE_YANDEX_GEOCODER_KEY=$VITE_YANDEX_GEOCODER_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# runtime-этап: nginx раздаёт собранную статику
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]