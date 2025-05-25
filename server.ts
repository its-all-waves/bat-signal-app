/**
Serve dingDong.
*/

import BatSignal from "./BatSignal.ts";
import { allowedOrigins } from "./secrets.ts";

const batSignal = new BatSignal();
await batSignal.connect(); // TODO: handle error -- cannot connect -- exponential backoff


Deno.serve((req) => {
  const { pathname } = new URL(req.url);
  const origin = req.headers.get("origin")

  if (!origin) return serverError()

  const isCool = authenticate(req)
  if (!isCool) {
    return unauthorizedResponse()
  }

  switch (pathname) {
    case "/connect": {
      const stream = getStream(req)

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": origin,
        }
      });
    }

    case "/dingDong": {
      try {
        batSignal.on();
        return Response.json({success: true})
      } catch (err) {
        console.log("Dingdong endpoint caused exception. Error: ", err);
        return Response.json({ success: false})
      }
    }
  }

  return notFoundResponse();
});

async function authenticate(req: Request) {
  if (req.method !== "POST") return false;
  
  const origin = req.headers.get("origin")
  if (!origin) return false
  if (!allowedOrigins.includes(origin)) return false;
  
  const { isAuthorizedLOL } =  await req.json();
  if (!isAuthorizedLOL) return false;

  return true;
}

function getStream(req: Request) {
  const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const interval = setInterval(() => {
              const data = `data: ${JSON.stringify({
                is_bat_signal_busy: batSignal.isOn(),
                is_someone_coming: batSignal.isSomeoneComing(),
                })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }, 1000);

            req.signal.addEventListener("abort", () => {
              clearInterval(interval);
              controller.close();
            });
          },
        });
  return stream
}

function notFoundResponse() {
  return new Response("404 Not Found", { status: 404 });
}

function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 });
}

function serverError() {
  return new Response("Oops, server error", { status: 501})
}