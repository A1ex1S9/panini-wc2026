# dev stage used by docker-compose (vite dev server with HMR)
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# production static build (GitHub Pages is the primary deploy target;
# this stage exists for self-hosting the frontend if needed)
FROM dev AS build
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
