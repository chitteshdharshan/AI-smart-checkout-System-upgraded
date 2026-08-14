# Express Backend Production Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5001
ENV PORT=5001
ENV NODE_ENV=production

CMD ["npm", "start"]
