# Stage 1: Build Angular app
FROM node:22-alpine AS build

WORKDIR /app

# Install all dependencies including dev
COPY package*.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the app in production mode
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy built files to nginx html directory
COPY --from=build /app/dist/qr-menu-scanner /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
