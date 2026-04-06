FROM node:20-alpine AS builder

# Install Python and build-essentials if necessary for bcrypt or other native compilation
RUN apk add --no-cache make gcc g++ python3

WORKDIR /app

# Copy package files and install dependencies cleanly
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

FROM node:20-alpine

WORKDIR /app

# Copy from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Ensure uploads directory exists and is writable
RUN mkdir -p /app/uploads && chown -R node:node /app

# Switch to a non-root user for security
USER node

# Expose the API port
EXPOSE 5000

# Set production environment flags
ENV NODE_ENV=production

# Run the system using node (not nodemon)
CMD ["npm", "start"]
