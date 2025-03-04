/**






*/

const notFoundResponse = new Response("404 Not Found", { status: 404 });

Deno.serve({ hostname: "localhost", port: 8080 }, async (req) => {
  const { pathname } = new URL(req.url);
  console.log({ pathname });
  switch (pathname) {
    case "/":
      try {
        const index = await Deno.open("./static/index.html", { read: true });
        return new Response(index.readable);
      } catch {
        return notFoundResponse;
      }
    case "/static/index.js":
      try {
        const indexJs = await Deno.open("./static/index.js", { read: true });
        return new Response(indexJs.readable);
      } catch {
        return notFoundResponse;
      }
    case "/dingDong": {
      const formData = req.body?.values;
      console.log(formData);
      try {
        // TODO: hit arduino could -> bat_signal_on = true
        return new Response("ding dong!");
      } catch {
        // TODO: better response
        return notFoundResponse;
      }
    }
    default:
      return notFoundResponse;
  }
});
