/**
Serve dingDong.
*/

import BatSignal from "./BatSignal.ts";

const batSignal = new BatSignal();
await batSignal.connect();

Deno.serve({ hostname: "localhost", port: 8080 }, async (req) => {
  const { pathname } = new URL(req.url);
  console.log({ pathname });
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
        return new Response(indexJs.readable);
      } catch {
        return notFoundResponse();
      }
    case "/dingDong": {
      try {
        batSignal.on();
        return new JSONResponse({ success: true });
      } catch {
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
