# Build stage
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist/bus-booking/browser /usr/share/nginx/html

EXPOSE 80

# Use official Node image as base
# FROM node:20-slim

# # Set working directory
# WORKDIR /app

# # Copy package files first (same caching trick as backend)
# COPY package.json package-lock.json ./

# # Install Angular dependencies
# RUN npm install

# # Copy the rest of the frontend code
# COPY . .

# # Expose Angular dev server port
# EXPOSE 4200

# # Start Angular dev server, binding to 0.0.0.0 so it's
# # accessible outside the container (not just localhost)
# CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200"]