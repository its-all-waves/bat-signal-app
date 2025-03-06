/**

Serve dingDong.

TODO:
  FEATURE:
    - [ ] add button to device that allows a response from
    the recipient of the bat signal
      - user dingDongs > recipient hits button on device > user sees "coming!"
      so they know it worked

*/

import { SSESink } from "jsr:@planigale/sse";
import BatSignal from "./BatSignal.ts";

const HOSTNAME = "0.0.0.0";
const PORT = 8080;

const SSE_MSG_INTERVAL_MS = 500;

const batSignal = new BatSignal();
await batSignal.connect(); // TODO: handle error -- cannot connect -- exponential backoff

Deno.serve({ hostname: HOSTNAME, port: PORT }, async (req) => {
  const { method, url } = req;
  const { pathname } = new URL(url);
  console.log(
    `${new Date().toISOString()} :: Request :: ${method} :: ${pathname}`,
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
      if (method !== "POST") return unauthorizedResponse();
      try {
        const { isAuthorizedLOL } = await req.json();
        if (!isAuthorizedLOL) return unauthorizedResponse();
      } catch {
        return unauthorizedResponse();
      }
      const sseSink = new SSESink();
      let interval = null;
      try {
        interval = setInterval(() => {
          try {
            sseSink.sendMessage({
              data: JSON.stringify({
                sse_interval_ms: SSE_MSG_INTERVAL_MS,
                is_bat_signal_busy: batSignal.isOn(),
                is_someone_coming: batSignal.isSomeoneComing(),
              }),
            });
          } catch (err) {
            // console.error("ERROR: Why does this happen?", err);
          }
        }, SSE_MSG_INTERVAL_MS);
        return sseSink.toResponse(); // TODO: what is this response? check in front end
      } catch (err) {
        console.error("ERROR: Issue with SSE:", err);
      }
      interval && clearInterval(interval);
      break;
    }

    // avoid responding to headless, automated requests by
    // requiring POST and body: { `isAuthorizedLol` }
    case "/dingDong": {
      if (method !== "POST") return unauthorizedResponse();

      try {
        const { isAuthorizedLOL } = await req.json();
        if (!isAuthorizedLOL) return unauthorizedResponse();
      } catch {
        return unauthorizedResponse();
      }
      try {
        batSignal.on();
        return new JSONResponse({ success: true });
      } catch (err) {
        console.error(err);
        return new JSONResponse({ success: false });
      }
    }

    default:
      return notFoundResponse();
  }
});

function notFoundResponse() {
  return new Response("404 Not Found", { status: 404 });
}

function unauthorizedResponse() {
  return new Response("Unathorized", { status: 401 });
}

class JSONResponse extends Response {
  constructor(obj: object) {
    let stringified;
    try {
      stringified = JSON.stringify(obj);
    } catch {
      throw new Error("`obj` must be stringifiable.");
    }
    super(stringified, { headers: { "Content-Type": "application/json" } });
  }
}
