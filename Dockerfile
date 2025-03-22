# Dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build the Vue app
RUN cd client && npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
