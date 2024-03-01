FROM node:16.20.2

WORKDIR /app

COPY . .

# build browser
RUN npm install

CMD [ "/bin/bash", "-c", "npm run build --workspace=@gribnoysup/mongodb-browser && npm run start-web"]

# TODO
# reduce the container size

# docker build -t jinbangyi/mongodb-web-ui:v0.0.2 .
# docker push jinbangyi/mongodb-web-ui:v0.0.2
