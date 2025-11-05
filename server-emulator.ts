/**

Serve dingDong with Emulator (no real Arduino hardware needed).

This server uses BatSignalEmulator instead of BatSignal, allowing you to test
the full system locally without connecting to Arduino IoT Cloud.

Run with: deno run --allow-net --allow-read server-emulator.ts

*/

import BatSignalEmulator from "./BatSignalEmulator.ts";

const HOSTNAME = "0.0.0.0";
const PORT = 8080;

// Create emulator with configurable delays
const batSignal = new BatSignalEmulator({
  deviceResponseDelay: 150, // 150ms Arduino response time
  simulateOffline: false,    // Start with device online
});
await batSignal.connect();

console.log("\n==============================================");
console.log("🦇 BAT SIGNAL EMULATOR SERVER RUNNING");
console.log("==============================================");
console.log(`Server: http://${HOSTNAME === "0.0.0.0" ? "localhost" : HOSTNAME}:${PORT}`);
console.log("\nEmulator Commands (type in this terminal):");
console.log("  - Press 's' to simulate sensor trigger");
console.log("  - Press 'o' to toggle offline/online");
console.log("  - Press 'q' to quit");
console.log("==============================================\n");

// Set up stdin listener for emulator commands
if (Deno.stdin.isTerminal()) {
  Deno.stdin.setRaw(true);

  (async () => {
    const buffer = new Uint8Array(1);
    while (true) {
      const n = await Deno.stdin.read(buffer);
      if (n === null) break;

      const key = String.fromCharCode(buffer[0]);

      switch (key) {
        case 's':
          console.log("\n[CMD] Toggling sensor...");
          batSignal.simulateSensorTrigger(!batSignal.isSomeoneComing());
          break;
        case 'o':
          console.log("\n[CMD] Toggling offline/online...");
          batSignal.setOffline(!batSignal.getConnectionStatus().isConnected);
          break;
        case 'q':
          console.log("\n[CMD] Shutting down...");
          Deno.exit(0);
          break;
      }
    }
  })();
}

Deno.serve({ hostname: HOSTNAME, port: PORT }, async (req: Request) => {
  const { method, url } = req;
  const { pathname } = new URL(url);

  const origin = req.headers.get("origin");

  console.log(
    `[ REQ ] ${new Date().toISOString()} :: ${
      origin ?? "[ NO ORIGIN ]"
    } :: ${method} :: ${pathname}`,
  );

  switch (pathname) {
    case "/":
      try {
        const index = await Deno.open("./static/index.html", { read: true });
        return new Response(index.readable);
      } catch {
        return notFoundResponse();
      }

    case "/static/index.js":
      try {
        const indexJs = await Deno.open("./static/index.js", { read: true });
        return new Response(indexJs.readable, {
          headers: { "Content-Type": "text/javascript" },
        });
      } catch {
        return notFoundResponse();
      }

    case "/connect": {
      // In emulator mode, allow all origins for easier testing
      const stream = newStream(req);
      return new Response(stream, { headers: sseHeaders(origin || "*") });
    }

    case "/dingDong": {
      // In emulator mode, allow all origins for easier testing
      try {
        batSignal.on(); // throws
        console.log(`ding dong at ${new Date()}`);
        return Response.json(
          { success: true },
          { headers: corsHeader(origin || "*") },
        );
      } catch (err) {
        console.log("Dingdong endpoint caused exception: ", err);
        return Response.json(
          { success: false },
          { headers: corsHeader(origin || "*") },
        );
      }
    }

    case "/emulator/status": {
      // Special endpoint to check emulator status
      const status = batSignal.getConnectionStatus();
      return Response.json(status, { headers: corsHeader(origin || "*") });
    }

    case "/emulator/sensor": {
      // Special endpoint to trigger sensor
      try {
        const body = await req.json();
        batSignal.simulateSensorTrigger(body.triggered);
        return Response.json(
          { success: true },
          { headers: corsHeader(origin || "*") },
        );
      } catch (err) {
        return Response.json(
          { success: false, error: String(err) },
          { headers: corsHeader(origin || "*") },
        );
      }
    }

    case "/emulator/offline": {
      // Special endpoint to toggle offline
      try {
        const body = await req.json();
        batSignal.setOffline(body.offline);
        return Response.json(
          { success: true },
          { headers: corsHeader(origin || "*") },
        );
      } catch (err) {
        return Response.json(
          { success: false, error: String(err) },
          { headers: corsHeader(origin || "*") },
        );
      }
    }
  }

  return notFoundResponse();
});

function sseHeaders(origin: string): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeader(origin),
  };
}

function corsHeader(origin: string): HeadersInit {
  return { "Access-Control-Allow-Origin": origin };
}

const SSE_HEARTBEAT_INTERVAL_MS = 6_000;

function newStream(req: Request) {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const heartbeatMsg = JSON.stringify({ heartbeat: 1 }) + "\n";

      // keep the connection alive
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode(heartbeatMsg));
      }, SSE_HEARTBEAT_INTERVAL_MS);

      const initialData = JSON.stringify({
          ts: Date.now(),
          is_bat_signal_busy: batSignal.isOn(),
          is_someone_coming: batSignal.isSomeoneComing(),
        }) + "\n";
      controller.enqueue(encoder.encode(initialData));

      const broadcastChannel = new BroadcastChannel("bat-signal");
      broadcastChannel.addEventListener("message", () => {
        const data = JSON.stringify({
            ts: Date.now(),
            is_bat_signal_busy: batSignal.isOn(),
            is_someone_coming: batSignal.isSomeoneComing(),
          }) + "\n";
        controller.enqueue(encoder.encode(data));
        console.log("[ INFO ] Sent message to client");
      });

      req.signal.addEventListener("abort", () => {
        console.error("[ ERROR ] Stream aborted by client");
        clearInterval(heartbeatInterval);
        broadcastChannel.close();
        controller.close();
      });
    },

    cancel(reason) {
      console.error("[ ERROR ] Stream was canceled:", reason);
    },
  });
}

function notFoundResponse() {
  return new Response(null, { status: 404 });
}
