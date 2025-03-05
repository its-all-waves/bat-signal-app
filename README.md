# Ding Dong / Bat Signal Server

## Run the Server Locally

- Install dependencies
  - `npm i && deno cache`
- Start the dev server
  - `deno task dev`

## Build & Run the Docker Container
- Build
`docker build -t ding-dong .`
- Run
  - `docker run -p 80:8080 ding-dong` 
  - _OR_ `docker run -d --restart=always -p 80:8080 ding-dong`
