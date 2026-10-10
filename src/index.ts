import createClient, { type Client } from "openapi-fetch";
import type { components, paths } from "./types/blurfield-api.js";

// ---------------------------------------------------------------------------
// Public types (friendly aliases over the generated OpenAPI schema names)
// ---------------------------------------------------------------------------

/** Blur methods supported by the Blurfield API. */
export type BlurMethod = components["schemas"]["BlurMethod"];

/** Standard response envelope returned by every blur endpoint. */
export type BaseResponse = components["schemas"]["BaseResponse"];

/** Request body for `POST /api/blur-photo/everyone`. */
export type BlurPhotoRequest =
  components["schemas"]["src__schemas__blur_photo_schemas__BlurEveryoneRequest"];

/** Request body for `POST /api/blur-photo/everyone/filtered`. */
export type BlurPhotoFilteredRequest =
  components["schemas"]["src__schemas__blur_photo_schemas__BlurEveryoneFilteredRequest"];

/** Request body for `POST /api/blur-video/everyone`. */
export type BlurVideoRequest =
  components["schemas"]["src__schemas__blur_video_schemas__BlurEveryoneRequest"];

/** Request body for `POST /api/blur-video/everyone/filtered`. */
export type BlurVideoFilteredRequest =
  components["schemas"]["src__schemas__blur_video_schemas__BlurEveryoneFilteredRequest"];

/** Request body for `POST /api/blur-video-timestamp/everyone`. */
export type BlurVideoTimestampRequest =
  components["schemas"]["src__schemas__blur_video_timestamp_schemas__BlurEveryoneRequest"];

/** Request body for `POST /api/blur-video-timestamp/everyone/filtered`. */
export type BlurVideoTimestampFilteredRequest =
  components["schemas"]["src__schemas__blur_video_timestamp_schemas__BlurEveryoneFilteredRequest"];

/** A `[startSeconds, endSeconds]` segment of video to blur. */
export type TimestampRange = [number, number];

/** Raw generated OpenAPI path map (for use with `client.raw`). */
export type { paths };

// ---------------------------------------------------------------------------
// Options & errors
// ---------------------------------------------------------------------------

export interface BlurfieldClientOptions {
  /**
   * API base URL of your Blurfield deployment, e.g. `"https://your-deployment.example.com"`.
   * Falls back to `BLURFIELD_BASE_URL`, then `BACKEND_API_URL`.
   */
  baseUrl?: string;
  /**
   * API key, sent as both `x-api-key` and `api-key` headers.
   * Falls back to `BLURFIELD_API_KEY`, then `BACKEND_API_KEY`.
   */
  apiKey?: string;
  /** Custom `fetch` implementation (testing, proxies, edge runtimes). */
  fetch?: typeof fetch;
}

export interface BlurfieldRequestOptions {
  /** Override the client-level API key for a single call. */
  apiKey?: string;
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
}

/** Thrown when the API returns a non-2xx response or the call fails. */
export class BlurfieldError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "BlurfieldError";
    this.status = status;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function readEnv(primary: string, fallback: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return env?.[primary] ?? env?.[fallback];
}

/**
 * Create a Blurfield API client.
 *
 * @example
 * ```ts
 * import { createBlurfieldClient } from "@blurfield/js";
 *
 * const blurfield = createBlurfieldClient({
 *   baseUrl: "https://your-deployment.example.com",
 *   apiKey: process.env.BLURFIELD_API_KEY,
 * });
 *
 * const res = await blurfield.blurPhotoEveryone({
 *   user_id: "user_123",
 *   generation_id: "gen_456",
 *   img_key: "uploads/photo.jpg",
 *   blur_method: "pixelate",
 *   output_key: "outputs/photo-blurred.jpg",
 * });
 * ```
 */
export function createBlurfieldClient(options: BlurfieldClientOptions = {}) {
  const baseUrl = (
    options.baseUrl ??
    readEnv("BLURFIELD_BASE_URL", "BACKEND_API_URL") ??
    ""
  ).replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error(
      "[blurfield] Missing `baseUrl`. Pass it explicitly — `createBlurfieldClient({ baseUrl })` — or set the BLURFIELD_BASE_URL environment variable.",
    );
  }

  const apiKey = options.apiKey ?? readEnv("BLURFIELD_API_KEY", "BACKEND_API_KEY");

  const defaultHeaders: Record<string, string> = {};
  if (apiKey) {
    defaultHeaders["x-api-key"] = apiKey;
    defaultHeaders["api-key"] = apiKey;
  }

  const raw: Client<paths> = createClient<paths>({
    baseUrl,
    headers: defaultHeaders,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  function headersFor(opts?: BlurfieldRequestOptions): Record<string, string> | undefined {
    if (!opts?.apiKey) return undefined;
    return { "x-api-key": opts.apiKey, "api-key": opts.apiKey };
  }

  async function unwrap<T>(
    result: Promise<{ data?: T; error?: unknown; response: Response }>,
    action: string,
  ): Promise<T> {
    const { data, error, response } = await result;
    if (!response.ok || data === undefined) {
      throw new BlurfieldError(
        `[blurfield] ${action} failed with HTTP ${response.status}`,
        response.status,
        error,
      );
    }
    return data;
  }

  return {
    /** Escape hatch: the underlying type-safe `openapi-fetch` client. */
    raw,
    /** The configured base URL (trailing slashes removed). */
    baseUrl,

    /** Blur every face in a photo. `POST /api/blur-photo/everyone` */
    blurPhotoEveryone(
      body: BlurPhotoRequest,
      opts?: BlurfieldRequestOptions,
    ): Promise<BaseResponse> {
      return unwrap(
        raw.POST("/api/blur-photo/everyone", {
          body,
          headers: headersFor(opts),
          signal: opts?.signal,
        }),
        "blurPhotoEveryone",
      );
    },

    /**
     * Blur every face in a photo except the reference face.
     * `POST /api/blur-photo/everyone/filtered`
     */
    blurPhotoEveryoneFiltered(
      body: BlurPhotoFilteredRequest,
      opts?: BlurfieldRequestOptions,
    ): Promise<BaseResponse> {
      return unwrap(
        raw.POST("/api/blur-photo/everyone/filtered", {
          body,
          headers: headersFor(opts),
          signal: opts?.signal,
        }),
        "blurPhotoEveryoneFiltered",
      );
    },

    /** Blur every face in a video. `POST /api/blur-video/everyone` */
    blurVideoEveryone(
      body: BlurVideoRequest,
      opts?: BlurfieldRequestOptions,
    ): Promise<BaseResponse> {
      return unwrap(
        raw.POST("/api/blur-video/everyone", {
          body,
          headers: headersFor(opts),
          signal: opts?.signal,
        }),
        "blurVideoEveryone",
      );
    },

    /**
     * Blur every face in a video except the reference face.
     * `POST /api/blur-video/everyone/filtered`
     */
    blurVideoEveryoneFiltered(
      body: BlurVideoFilteredRequest,
      opts?: BlurfieldRequestOptions,
    ): Promise<BaseResponse> {
      return unwrap(
        raw.POST("/api/blur-video/everyone/filtered", {
          body,
          headers: headersFor(opts),
          signal: opts?.signal,
        }),
        "blurVideoEveryoneFiltered",
      );
    },

    /**
     * Blur every face in the given timestamp ranges of a video.
     * `POST /api/blur-video-timestamp/everyone`
     */
    blurVideoTimestampEveryone(
      body: BlurVideoTimestampRequest,
      opts?: BlurfieldRequestOptions,
    ): Promise<BaseResponse> {
      return unwrap(
        raw.POST("/api/blur-video-timestamp/everyone", {
          body,
          headers: headersFor(opts),
          signal: opts?.signal,
        }),
        "blurVideoTimestampEveryone",
      );
    },

    /**
     * Blur every face in the given timestamp ranges of a video,
     * except the reference face.
     * `POST /api/blur-video-timestamp/everyone/filtered`
     */
    blurVideoTimestampEveryoneFiltered(
      body: BlurVideoTimestampFilteredRequest,
      opts?: BlurfieldRequestOptions,
    ): Promise<BaseResponse> {
      return unwrap(
        raw.POST("/api/blur-video-timestamp/everyone/filtered", {
          body,
          headers: headersFor(opts),
          signal: opts?.signal,
        }),
        "blurVideoTimestampEveryoneFiltered",
      );
    },

    /** Liveness probe. `GET /healthz` */
    health(opts?: BlurfieldRequestOptions): Promise<unknown> {
      return unwrap(
        raw.GET("/healthz", { headers: headersFor(opts), signal: opts?.signal }),
        "health",
      );
    },

    /** Readiness probe (warms cached models, checks S3 reachability). `GET /readyz` */
    ready(opts?: BlurfieldRequestOptions): Promise<unknown> {
      return unwrap(
        raw.GET("/readyz", { headers: headersFor(opts), signal: opts?.signal }),
        "ready",
      );
    },
  };
}

/** The return type of {@link createBlurfieldClient}. */
export type BlurfieldClient = ReturnType<typeof createBlurfieldClient>;
