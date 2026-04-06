# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set environment variables for production build
# This forces the build to route API and Socket calls relatively
# So they hit the Nginx reverse proxy instead of 'localhost:5000'
ENV VITE_API_URL=/api/v1
ENV VITE_SOCKET_URL=/
RUN npm run build

# Stage 2: Serve via Nginx Reverse Proxy
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the static output from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Overwrite default nginx config with our reverse proxy configurations
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
