FROM node:14-alpine
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci
COPY . .
RUN rm .env
RUN mv .env-deploy .env
EXPOSE 8080
CMD ["node", "index.js"]
