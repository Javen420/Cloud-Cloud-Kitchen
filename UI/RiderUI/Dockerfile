FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=""
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM httpd:alpine
COPY --from=build /app/dist /usr/local/apache2/htdocs/
EXPOSE 80
CMD ["httpd-foreground"]
