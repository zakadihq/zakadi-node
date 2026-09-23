// A fake Zakadi API on node:http. Each test sets `reply(request, n)`, which answers the
// n-th request as {status, headers, body}; every request is recorded with its raw body.
import { Buffer } from "node:buffer";
import { createServer } from "node:http";

export async function startFakeApi() {
  const api = {
    requests: [],
    reply: () => ({ status: 404, body: { code: "session_not_found" } }),
  };
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const request = {
      method: req.method,
      path: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    };
    api.requests.push(request);
    const {
      status = 200,
      headers = {},
      body = "",
    } = await api.reply(request, api.requests.length);
    const json = typeof body !== "string";
    res.writeHead(status, {
      "content-type": json ? "application/json" : "text/html",
      ...headers,
    });
    res.end(json ? JSON.stringify(body) : body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  api.baseUrl = `http://127.0.0.1:${server.address().port}`;
  api.close = () => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  };
  return api;
}

/** A problem reply (spec/02-api.md 2.1). */
export function problem(status, code, headers = {}) {
  return {
    status,
    headers: { "content-type": "application/problem+json", ...headers },
    body: {
      type: `https://api.zakadi.dev/problems/${code}`,
      title: code,
      status,
      detail: `detail of ${code}`,
      code,
      request_id: `req_${code}`,
    },
  };
}
