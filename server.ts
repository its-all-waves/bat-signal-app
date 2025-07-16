/**

Serve dingDong.

TODO:
  FEATURE:
    - [ ] tell user when the bat signal is unavailable

*/

import BatSignal from "./BatSignal.ts";
import { allowedOrigins } from "./secrets.ts";

const HOSTNAME = "0.0.0.0";
const PORT = 8080;

const batSignal = new BatSignal();
await batSignal.connect(); // TODO: handle error -- cannot connect -- exponential backoff

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
      if (!(await isRequestAllowed(req))) {
        return notFoundResponse();
      }
      const stream = newStream(req);
      return new Response(stream, { headers: sseHeaders(origin!) });
    }

    case "/dingDong": {
      if (!(await isRequestAllowed(req))) {
        return notFoundResponse();
      }
      try {
        batSignal.on(); // throws
        console.log(`ding dong at ${new Date()}`);
        return Response.json(
          { success: true },
          { headers: corsHeader(origin!) },
        );
      } catch (err) {
        console.log("Dingdong endpoint caused exception: ", err);
        return Response.json(
          { success: false },
          { headers: corsHeader(origin!) },
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

/** Avoid responding to headless, automated requests by
requiring POST and body: { `isAuthorizedLol` }, and
ensure host is allowed. */
async function isRequestAllowed(req: Request) {
  if (req.method !== "POST") return false;

  const origin = req.headers.get("origin");

  if (!origin) return false;
  if (!allowedOrigins.includes(origin)) return false;

  // TODO: compare with an env var instead and get this out of the repo
  try {
    const { isAuthorizedLOL } = await req.json();
    if (!isAuthorizedLOL) return false;
  } catch (err) {
    console.error("[ ERR ] Couldn't authenticate the request:", err);
    return false;
  }

  return true;
}

const SSE_HEARTBEAT_INTERVAL_MS = 9_000;

function newStream(req: Request) {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // const heartbeatMsg = `data: ${JSON.stringify({ heartbeat: 1 })} \n\n`;

      // // send initial message to keep connection open
      // controller.enqueue(encoder.encode(heartbeatMsg));

      // const heartbeatInterval = setInterval(() => {
      //   controller.enqueue(
      //     encoder.encode(
      //       heartbeatMsg,
      //     ),
      //   );
      // }, SSE_HEARTBEAT_INTERVAL_MS);

      const broadcastChannel = new BroadcastChannel("bat-signal");
      broadcastChannel.addEventListener("message", () => {
        const data = `data: ${
          JSON.stringify({
            is_bat_signal_busy: batSignal.isOn(),
            is_someone_coming: batSignal.isSomeoneComing(),
          })
        }\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      req.signal.addEventListener("abort", () => {
        console.error("[ ERR ] Stream aborted by client");
        // clearInterval(heartbeatInterval);
        broadcastChannel.close();
        controller.close();
      });
    },

    cancel(reason) {
      console.error("[ ERR ] Stream was canceled:", reason);
    },
  });
}

function notFoundResponse() {
  return new Response(null, { status: 404 });
}

function unauthorizedResponse() {
  return new Response("Unathorized", { status: 401 });
}

function serverErrorResponse() {
  return new Response("Oops, server error", { status: 501 });
}
