/**

Serve dingDong.

*/

import BatSignal from "./BatSignal.ts";

const batSignal = new BatSignal();
// TODO: handle error -- cannot connect -- exponential backoff
await batSignal.connect();

Deno.serve({ hostname: "localhost", port: 8080 }, async (req) => {
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
        return new Response(indexJs.readable);
      } catch {
        return notFoundResponse();
      }

    // avoid responding to headless, automated requests by
    // requiring POST and body: { `isAuthorizedLol` }
    case "/dingDong": {
      if (method !== "POST") return unauthorizedResposne();
      try {
        const { isAuthorizedLOL } = await req.json();
        if (!isAuthorizedLOL) return unauthorizedResposne();
      } catch {
        return unauthorizedResposne();
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

function unauthorizedResposne() {
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
