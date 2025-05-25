
FROM denoland/deno:latest

EXPOSE 8080

RUN apt-get update && apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_23.x -o nodesource_setup.sh && \
    bash nodesource_setup.sh

RUN apt-get install -y git nodejs

RUN apt-get install -y sudo

RUN mkdir /home/deno && chown -R deno:deno /home/deno
