FROM node:alpine as builder

WORKDIR '/app'

COPY package.json .
# RUN apk add --update sudo

# USER root

RUN npm install yarn
RUN yarn
COPY . .

RUN yarn build

FROM nginx
COPY --from=builder /app/build /usr/share/nginx/html
