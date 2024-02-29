FROM ubuntu:22.04

WORKDIR /app

ARG WEBSOCKET_SECURE=false
ARG WEBSOCKET_HOST=localhost
ARG WEBSOCKET_PORT=1338
ARG MONGODB_CONN_STR

RUN apt update && \
apt install curl python3 python3-pip -y && \
ln -s /usr/bin/python3 /usr/bin/python && \
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
export NVM_DIR="$HOME/.nvm" && \
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \
nvm install 16.20.2 && nvm use 16.20.2

COPY . .

# add config
RUN echo ' \
export const proxy = { \
  secure: ${WEBSOCKET_SECURE}, \
  host: "${WEBSOCKET_HOST}", \
  port: "${WEBSOCKET_PORT}", \
};' > /app/packages/mongodb-browser/src/vars.ts && \
echo ' \
const mongodbConnectionString="${MONGODB_CONN_STR}"; \
export { mongodbConnectionString };' > /app/packages/compass-web/sandbox/vars.tsx

# build browser
RUN /root/.nvm/versions/node/v16.20.2/bin/npm install && \
/root/.nvm/versions/node/v16.20.2/bin/npm run build --workspace=@gribnoysup/mongodb-browser 

CMD [ "/root/.nvm/versions/node/v16.20.2/bin/npm" "run" "start-web"]

# TODO
# build web

# docker build -t temp --build-arg WEBSOCKET_HOST=18.140.196.119 .