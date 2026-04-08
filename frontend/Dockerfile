FROM node:22-alpine AS build
WORKDIR /app/frontend

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
COPY ml-pipelines ../ml-pipelines/
RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
