# Ding Dong / Bat Signal Server

## Run the Server Locally (Production)

- Install dependencies
  - `npm i && deno cache`
- Start the dev server
  - `deno task dev`

## Run the Emulator (Testing without Arduino Hardware)

The emulator allows you to test the full system locally without connecting to Arduino IoT Cloud or physical hardware.

### Option 1: Run Emulator Server with Interactive Commands

```bash
deno run --allow-net --allow-read server-emulator.ts
```

Interactive commands in the terminal:
- Press `s` to toggle sensor (someone_is_coming)
- Press `o` to toggle device offline/online
- Press `q` to quit

Then open your browser to `http://localhost:8080` to use the frontend.

### Option 2: Run Automated Tests

```bash
deno run --allow-net test-emulator.ts
```

This runs through all scenarios: ding dong, acknowledgements, sensor triggers, and offline behavior.

### Emulator Features

- Simulates Arduino device responses with configurable delays
- Tests acknowledgement flow (did_bat_signal_turn_on)
- Simulates sensor triggers (someone_is_coming)
- Tests offline/online scenarios
- Additional API endpoints for testing (see `EMULATOR_USAGE.md`)

See `EMULATOR_USAGE.md` for detailed documentation.

## Build & Run the Docker Container
- Build
`docker build -t ding-dong .`
- Run
  - `docker run -p 80:8080 ding-dong`
  - _OR_ `docker run -d --restart=always -p 80:8080 ding-dong`
