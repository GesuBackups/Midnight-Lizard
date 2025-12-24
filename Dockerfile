FROM node:24-alpine
WORKDIR /build
COPY ./package.json .
RUN npm install
COPY . .
ENTRYPOINT npm run prod-pack
