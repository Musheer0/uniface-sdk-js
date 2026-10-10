import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BlurfieldError, createBlurfieldClient } from "../dist/esm/index.js";

// openapi-fetch calls the custom fetch with a `Request` instance, so the
// mock normalizes both `Request` and `(url, init)` styles into one shape.
function mockFetch(handler) {
  return async (input, init = {}) => {
    let url;
    let method;
    let headers;
    let body;
    if (input instanceof Request) {
      url = new URL(input.url);
      method = input.method;
      headers = new Headers(input.headers);
      if (init.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      }
      body = init.body ?? (input.method === "GET" ? undefined : await input.text());
    } else {
      url = new URL(String(input));
      method = init.method;
      headers = new Headers(init.headers);
      body = init.body;
    }
    return handler(url, { method, headers, body });
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createBlurfieldClient", () => {
  it("throws when baseUrl is missing", () => {
    assert.throws(() => createBlurfieldClient({}), /Missing `baseUrl`/);
  });

  it("strips trailing slashes from baseUrl", () => {
    const client = createBlurfieldClient({
      baseUrl: "https://api.example.com///",
      fetch: mockFetch(() => jsonResponse({ ok: true })),
    });
    assert.equal(client.baseUrl, "https://api.example.com");
  });

  it("sends api key headers and returns data on success", async () => {
    let seen;
    const client = createBlurfieldClient({
      baseUrl: "https://api.example.com",
      apiKey: "secret",
      fetch: mockFetch((url, req) => {
        seen = { url: url.toString(), req };
        return jsonResponse({ success: true, generation_id: "gen_1" });
      }),
    });

    const data = await client.blurPhotoEveryone({
      user_id: "u1",
      generation_id: "gen_1",
      img_key: "in/photo.jpg",
      blur_method: "pixelate",
      output_key: "out/photo.jpg",
    });

    assert.equal(data.success, true);
    assert.equal(data.generation_id, "gen_1");
    assert.equal(seen.url, "https://api.example.com/api/blur-photo/everyone");
    assert.equal(seen.req.method, "POST");
    assert.equal(seen.req.headers.get("x-api-key"), "secret");
    assert.equal(seen.req.headers.get("api-key"), "secret");
    assert.equal(JSON.parse(seen.req.body).img_key, "in/photo.jpg");
  });

  it("throws BlurfieldError on API failure", async () => {
    const client = createBlurfieldClient({
      baseUrl: "https://api.example.com",
      apiKey: "secret",
      fetch: mockFetch(() => jsonResponse({ detail: "bad" }, 422)),
    });

    await assert.rejects(
      () =>
        client.blurVideoEveryone({
          user_id: "u",
          generation_id: "g",
          video_key: "v.mp4",
          blur_method: "gaussian",
          output_key: "o.mp4",
        }),
      (err) => err instanceof BlurfieldError && err.status === 422,
    );
  });

  it("supports per-request apiKey override", async () => {
    let seen;
    const client = createBlurfieldClient({
      baseUrl: "https://api.example.com",
      fetch: mockFetch((url, req) => {
        seen = req;
        return jsonResponse({ success: true });
      }),
    });

    await client.health({ apiKey: "one-off" });
    assert.equal(seen.headers.get("x-api-key"), "one-off");
  });
});
