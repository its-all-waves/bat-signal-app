
FROM denoland/deno:latest

EXPOSE 8080

WORKDIR /dingDong

COPY ./static ./static

COPY . .

RUN apt-get update && apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_23.x -o nodesource_setup.sh && \
    bash nodesource_setup.sh

RUN apt-get install -y git nodejs

RUN npm i

# Cache static dependencies
RUN deno cache server.ts

# Warmup caches for 10s. If no error, or times out build 
RUN timeout 10s deno -A server.ts || [ $? -eq 124 ] || exit 1

USER deno

CMD ["run", "-NRE", "server.ts"]
