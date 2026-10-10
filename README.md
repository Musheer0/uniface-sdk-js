# Blurfield JS SDK

Official JavaScript/TypeScript SDK for the Blurfield face-blurring API. Blur every face in photos and videos — or blur everyone *except* a reference face.

- 🖼️ Photo blurring (`/api/blur-photo/...`)
- 🎬 Full video blurring (`/api/blur-video/...`)
- ⏱️ Timestamp-range video blurring (`/api/blur-video-timestamp/...`)
- 🛡️ Fully typed via the live OpenAPI spec (`openapi-fetch` + `openapi-typescript`)
- 📦 Works with ESM (`import`) and CommonJS (`require`), Node 18+ and browsers

## Requirements

- Node.js `>= 18` (uses the global `fetch`)

## Install

```bash
npm install @blurfield/js
# pnpm add @blurfield/js
# yarn add @blurfield/js
# bun add @blurfield/js
```

## Quickstart

```ts
import { createBlurfieldClient } from "@blurfield/js";

const blurfield = createBlurfieldClient({
  baseUrl: "https://your-deployment.example.com",
  apiKey: process.env.BLURFIELD_API_KEY,
});

// Blur every face in a photo
const res = await blurfield.blurPhotoEveryone({
  user_id: "user_123",
  generation_id: "gen_456",
  img_key: "uploads/photo.jpg",
  blur_method: "pixelate",
  output_key: "outputs/photo-blurred.jpg",
});

console.log(res.success, res.generation_id);
```

CommonJS works too:

```js
const { createBlurfieldClient } = require("@blurfield/js");
```

## Configuration

```ts
const blurfield = createBlurfieldClient({
  baseUrl: "https://your-deployment.example.com", // required (or via env)
  apiKey: "secret",                                             // optional (or via env)
  fetch: customFetch,                                           // optional (testing, proxies, edge)
});
```

| Option    | Env fallback (in order)                          | Notes                                                        |
| --------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `baseUrl` | `BLURFIELD_BASE_URL`, then `BACKEND_API_URL`     | Required. Trailing slashes are stripped.                     |
| `apiKey`  | `BLURFIELD_API_KEY`, then `BACKEND_API_KEY`      | Sent as both `x-api-key` and `api-key` headers.              |
| `fetch`   | —                                                | Defaults to the global `fetch`.                              |

You can also override the API key for a single call:

```ts
await blurfield.health({ apiKey: "one-off-key" });
```

And cancel any call with an `AbortSignal`:

```ts
const controller = new AbortController();
await blurfield.blurVideoEveryone({ ... }, { signal: controller.signal });
```

> `.env` tip: copy `.env.example` to `.env`. The `sync-api` script loads it via `dotenv`. (The SDK itself just reads `process.env` — no `dotenv` dependency is shipped.)

## API reference

All methods return the `BaseResponse` envelope (`{ success, generation_id, user_id, message, error }`) and throw `BlurfieldError` on non-2xx responses.

| Method                                 | Endpoint                                        | Description                                        |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| `blurPhotoEveryone(body)`              | `POST /api/blur-photo/everyone`                 | Blur every face in a photo                         |
| `blurPhotoEveryoneFiltered(body)`      | `POST /api/blur-photo/everyone/filtered`        | Blur everyone *except* the reference face (photo)  |
| `blurVideoEveryone(body)`              | `POST /api/blur-video/everyone`                 | Blur every face in a video                         |
| `blurVideoEveryoneFiltered(body)`      | `POST /api/blur-video/everyone/filtered`        | Blur everyone *except* the reference face (video)  |
| `blurVideoTimestampEveryone(body)`     | `POST /api/blur-video-timestamp/everyone`       | Blur faces within timestamp ranges                 |
| `blurVideoTimestampEveryoneFiltered(body)` | `POST /api/blur-video-timestamp/everyone/filtered` | Blur faces within ranges, except the reference face |
| `health()`                             | `GET /healthz`                                  | Liveness probe                                     |
| `ready()`                              | `GET /readyz`                                   | Readiness probe (warms models, checks S3)          |

### Blur methods

`blur_method` accepts: `"pixelate" | "gaussian" | "blackout" | "elliptical" | "median"`

### Examples

Blur a video:

```ts
await blurfield.blurVideoEveryone({
  user_id: "user_123",
  generation_id: "gen_789",
  video_key: "uploads/clip.mp4",
  blur_method: "gaussian",
  output_key: "outputs/clip-blurred.mp4",
});
```

Keep one person unblurred (`face_key` points at the reference face image):

```ts
await blurfield.blurPhotoEveryoneFiltered({
  user_id: "user_123",
  generation_id: "gen_999",
  img_key: "uploads/group.jpg",
  blur_method: "elliptical",
  output_key: "outputs/group-blurred.jpg",
  face_key: "references/alice.jpg",
});
```

Blur only specific segments of a video (`timestamp_ranges` are `[startSeconds, endSeconds]` pairs):

```ts
await blurfield.blurVideoTimestampEveryone({
  user_id: "user_123",
  generation_id: "gen_101",
  video_key: "uploads/interview.mp4",
  blur_method: "blackout",
  output_key: "outputs/interview-blurred.mp4",
  timestamp_ranges: [
    [0, 12.5],
    [30, 45],
  ],
});
```

## Error handling

```ts
import { BlurfieldError } from "@blurfield/js";

try {
  await blurfield.blurPhotoEveryone({ ... });
} catch (err) {
  if (err instanceof BlurfieldError) {
    console.error(err.status, err.details); // e.g. 422 + validation details
  }
  throw err;
}
```

`BlurfieldError` carries:

- `message` — e.g. `[blurfield] blurPhotoEveryone failed with HTTP 422`
- `status` — the HTTP status code
- `details` — the parsed error body (e.g. FastAPI validation errors)

## TypeScript

Request/response types are exported with friendly names:

```ts
import type {
  BlurMethod,
  BaseResponse,
  BlurPhotoRequest,
  BlurPhotoFilteredRequest,
  BlurVideoRequest,
  BlurVideoFilteredRequest,
  BlurVideoTimestampRequest,
  BlurVideoTimestampFilteredRequest,
  TimestampRange,
  BlurfieldClient,
} from "@blurfield/js";
```

### Escape hatch: the raw client

`client.raw` is the underlying type-safe `openapi-fetch` client if you need direct access to any current or future endpoint:

```ts
const { data, error } = await blurfield.raw.POST("/api/blur-photo/everyone", {
  body: { ... },
});
```

## Framework snippets

Next.js Route Handler (server-side, keeps your API key secret):

```ts
// app/api/blur/route.ts
import { NextResponse } from "next/server";
import { createBlurfieldClient } from "@blurfield/js";

const blurfield = createBlurfieldClient({
  baseUrl: process.env.BLURFIELD_BASE_URL!,
  apiKey: process.env.BLURFIELD_API_KEY!,
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = await blurfield.blurPhotoEveryone(body);
  return NextResponse.json(result);
}
```

Browser (call your own backend, never ship the API key to the client):

```ts
import { createBlurfieldClient } from "@blurfield/js";

// Point at YOUR backend, which proxies to Blurfield with the secret key.
const blurfield = createBlurfieldClient({ baseUrl: "https://my-app.com" });
await blurfield.health();
```

## Maintainer: regenerating types

Types in `src/types/blurfield-api.d.ts` are generated from the live OpenAPI spec:

```bash
npm run sync-api -- https://your-deployment.example.com # explicit URL
BLURFIELD_BASE_URL=https://... npm run sync-api          # via env
```

`BACKEND_API_URL` is still accepted as a legacy alias. Run `npm run build` afterwards so `dist/` picks up the changes.

## Maintainer: build & publish

```bash
npm run typecheck  # tsc --noEmit
npm run build      # emits dist/esm (ESM) + dist/cjs (CJS) + .d.ts
npm test           # builds, then runs node:test smoke tests (mocked fetch, no network)
npm publish        # runs prepublishOnly -> build; publishes dist/ + README + LICENSE
```

## License

MIT — see [LICENSE](./LICENSE).
