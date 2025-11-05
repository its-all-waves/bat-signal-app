# Bat Signal Emulator Usage Guide

The Bat Signal Emulator allows you to test the full system locally without connecting to Arduino IoT Cloud or physical hardware.

## Quick Start

### 1. Start the Emulator Server

```bash
deno run --allow-net --allow-read server-emulator.ts
```

The server will start on `http://localhost:8080` and display interactive commands.

### 2. Test with the Test Client

In a new terminal, run:

```bash
deno run --allow-net test-emulator.ts
```

This will run through a series of automated tests demonstrating:
- SSE connection
- Ding dong (bat signal activation)
- Arduino acknowledgement flow
- Sensor triggers
- Offline/online scenarios

## How It Works

### Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Web Frontend   │─────▶│  Emulator Server │◀────▶│ Mock Arduino │
│  or Test Client │ HTTP  │  (server-emulator)│ SSE  │   (in-memory)│
└─────────────────┘      └──────────────────┘      └──────────────┘
```

### Components

1. **MockArduinoCloud.ts** - Simulates Arduino IoT Cloud MQTT connection
   - Emulates cloud property updates
   - Simulates device response delays
   - Can simulate offline scenarios

2. **BatSignalEmulator.ts** - Drop-in replacement for BatSignal.ts
   - Same API as production BatSignal
   - Adds emulator-specific methods (sensor triggers, offline toggle)

3. **server-emulator.ts** - Modified server using the emulator
   - All CORS restrictions relaxed for local testing
   - Additional `/emulator/*` endpoints for testing

4. **test-emulator.ts** - Automated test client
   - Demonstrates all functionality
   - Shows expected behavior

## Interactive Server Commands

When running `server-emulator.ts`, you can use these keyboard commands:

- **`s`** - Toggle sensor (someone_is_coming)
- **`o`** - Toggle device offline/online
- **`q`** - Quit server

## API Endpoints (Emulator Mode)

### Standard Endpoints

- **`GET /`** - Serve index.html
- **`GET /static/index.js`** - Serve JavaScript
- **`POST /connect`** - SSE stream (no auth required in emulator)
- **`POST /dingDong`** - Trigger bat signal (no auth required in emulator)

### Emulator-Specific Endpoints

- **`GET /emulator/status`** - Get current emulator state
  ```json
  {
    "isConnected": true,
    "bat_signal": false,
    "someone_is_coming": false,
    "did_bat_signal_turn_on": false
  }
  ```

- **`POST /emulator/sensor`** - Simulate sensor trigger
  ```bash
  curl -X POST http://localhost:8080/emulator/sensor \
    -H "Content-Type: application/json" \
    -d '{"triggered": true}'
  ```

- **`POST /emulator/offline`** - Toggle device offline/online
  ```bash
  curl -X POST http://localhost:8080/emulator/offline \
    -H "Content-Type: application/json" \
    -d '{"offline": true}'
  ```

## Testing Scenarios

### Test Acknowledgement Flow

1. Start emulator server
2. Call `/dingDong` endpoint
3. Watch logs for:
   ```
   [MOCK CLOUD] Sending bat_signal = true to cloud
   [MOCK ARDUINO] Received bat_signal=true, turning on projector
   [MOCK ARDUINO] Sending acknowledgement: did_bat_signal_turn_on=true
   RECEIVED ACKNOWLEDGEMENT FROM ARDUINO: Bat Signal projector is ON
   RESET ACKNOWLEDGEMENT FLAG
   ```
4. State updates only after acknowledgement received

### Test Offline Behavior

1. Start emulator server
2. Press `o` to take device offline
3. Call `/dingDong` endpoint
4. Observe: Request fails because device is offline
5. Press `o` again to bring device back online
6. Call `/dingDong` again - should work

### Test Sensor Trigger

1. Start emulator server
2. Connect to SSE stream at `/connect`
3. Press `s` to trigger sensor
4. Observe: SSE message sent with `someone_is_coming: true`

### Test with Frontend

If you have a frontend in `./static/`:

1. Start emulator server: `deno run --allow-net --allow-read server-emulator.ts`
2. Open browser to `http://localhost:8080`
3. Frontend will work normally (no auth required in emulator mode)
4. Use server keyboard commands to simulate Arduino events

## Configuration

Modify emulator behavior in `server-emulator.ts`:

```typescript
const batSignal = new BatSignalEmulator({
  deviceResponseDelay: 150,  // Change Arduino response time (ms)
  simulateOffline: false,     // Start offline: true/false
});
```

## Comparing to Production

### Production (server.ts)
- Connects to real Arduino IoT Cloud via MQTT
- Requires actual Arduino device to respond
- Requires `secrets.ts` with credentials
- CORS restricted to allowed origins
- Auth required (`isAuthorizedLOL`)

### Emulator (server-emulator.ts)
- Uses in-memory mock Arduino
- Simulates device responses instantly (configurable delay)
- No credentials needed
- CORS open for testing
- Auth bypassed
- Extra debugging endpoints

## Troubleshooting

### Port already in use
```bash
# Find process on port 8080
lsof -ti:8080 | xargs kill -9
```

### SSE not connecting
- Check that server is running
- Verify `http://localhost:8080/emulator/status` returns JSON
- Check browser console for CORS errors

### Acknowledgement not working
- Check server logs for the full flow
- Verify `deviceResponseDelay` isn't too short
- Look for "[MOCK ARDUINO]" messages in logs

## Next Steps

Once local testing is complete:
1. Test against real Arduino hardware using `server.ts`
2. Deploy to production
3. Update CORS origins in production `server.ts`
4. Add proper authentication tokens

## SSE Message Format

Messages sent via Server-Sent Events:

```json
{
  "ts": 1234567890123,
  "is_bat_signal_busy": false,
  "is_someone_coming": false
}
```

Heartbeat messages (every 6 seconds):
```json
{
  "heartbeat": 1
}
```
