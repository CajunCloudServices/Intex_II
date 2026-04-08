FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm ci

COPY . ./
# Do not run `npm run build` here: its prebuild runs sync-ml-dashboards, which expects a monorepo
# layout (../ml-pipelines). Docker build context is only ./frontend. Use committed public/ml-dashboards.
RUN npx tsc -b && npx vite build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
