/**
 * The qa site's Worker: it forwards the API's paths to Cloud Run and leaves
 * everything else to the static export.
 *
 * The browser must never call `*.run.app` itself. That is another site, so
 * better-auth's `SameSite=Lax` session cookie would not travel with the app's
 * `fetch` calls, and Safari refuses third-party cookies outright. Reached
 * through this origin instead, every cookie the API sets is the site's own.
 *
 * Only `/api/*` and `/socket.io/*` invoke it (`run_worker_first` in
 * wrangler.jsonc): pages and assets are still served without running a Worker,
 * so they stay unmetered and clear of the Free plan's CPU limit.
 */

interface Env {
  /** The static export, bound as `assets.binding`. */
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
  /** Where the API runs, e.g. `https://advisory-api-qa-….run.app`. */
  readonly API_ORIGIN: string;
}

const API_PATHS = ["/api/", "/socket.io/"];

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!API_PATHS.some((prefix) => url.pathname.startsWith(prefix))) return env.ASSETS.fetch(request);

    const target = new URL(`${url.pathname}${url.search}`, env.API_ORIGIN);
    // Method, headers (cookies and the Origin the API checks) and body go as
    // they came, and so does a WebSocket upgrade. Redirects are handed back to
    // the browser rather than followed here, so a redirect that sets a cookie
    // sets it on this site.
    return fetch(new Request(target, request), { redirect: "manual" });
  },
};

export default worker;
