FROM ubuntu:22.04

WORKDIR /app

COPY . .

ENV WEBSOCKET_SECURE=false
ENV WEBSOCKET_HOST=localhost
ENV WEBSOCKET_PORT=1338
ENV MONGODB_CONN_STR

RUN apt update && \
apt install curl -y && \
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
nvm install 16.20.2 && nvm use 16.20.2 && \
npm install

# add config
RUN echo '
export const proxy = {
  secure: ${WEBSOCKET_SECURE},
  host: "${WEBSOCKET_HOST}",
  port: "${WEBSOCKET_PORT}",
};' > /app/packages/mongodb-browser/src/vars.ts && \
echo '
const mongodbConnectionString="${MONGODB_CONN_STR}";
export { mongodbConnectionString };' > /app/packages/compass-web/sandbox/vars.tsx

CMD [ "/root/.nvm/versions/node/v16.20.2/bin/npm" "run" "start-web"]
