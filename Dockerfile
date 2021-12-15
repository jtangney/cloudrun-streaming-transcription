FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install
RUN npm install browserify
COPY . .

# browserify the client-side js
RUN npm run build

EXPOSE 8080
CMD [ "npm", "start" ]