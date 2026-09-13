FROM node:20-alpine AS builder


WORKDIR /src

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Next.js port
EXPOSE 3000
EXPOSE 9229

# Run Next.js dev server
CMD ["npm", "run", "dev"]
