/**
 * All identity, email, tokens and rows below are synthetic fixtures.
 * Every Supabase HTTP request is intercepted: this suite cannot send hosted
 * confirmation emails, create hosted users, or mutate hosted profiles.
 */
export const accountA = "10000000-0000-4000-8000-000000000001";
export const accountB = "10000000-0000-4000-8000-000000000002";
export const user = (id = accountA, metadata = {}) => ({
  id, aud: "authenticated", role: "authenticated", email: id === accountA ? "fixture-a@example.com" : "fixture-b@example.com",
  email_confirmed_at: "2026-11-12T00:00:00Z", confirmed_at: "2026-11-12T00:00:00Z", created_at: "2026-11-12T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: metadata, identities: [],
});
export function session(id = accountA, expired = false, metadata = {}) {
  const exp = Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600);
  const encode = (input) => Buffer.from(JSON.stringify(input)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, role: "authenticated", aud: "authenticated", exp })}.fixture_signature`,
    refresh_token: "synthetic-refresh", token_type: "bearer", expires_in: 3600, expires_at: exp, user: user(id, metadata),
  };
}
export const profile = (id = accountA, complete = false) => ({
  id, display_name: null, style_preferences: [], onboarding_completed_at: complete ? "2026-11-12T00:00:00Z" : null,
  created_at: "2026-11-12T00:00:00Z", updated_at: "2026-11-12T00:00:00Z",
});
export function createAuthFixtures(origin, { handleData, extraPatterns = [] } = {}) {
  const rows = new Map();
  const signupMetadata = new Map();
  const counts = { signup: 0, password: 0, resend: 0, verify: 0, reset: 0, passwordUpdate: 0, user: 0, exchange: 0, provision: 0, update: 0, logout: 0, refresh: 0, oauth: 0, forbidden: 0 };
  const state = { google: false, loginError: null, signupSession: false, saveError: false, readError: false, resendError: false, otpError: false, exchangeError: false, refreshError: false, delay: 0, account: accountA, userError: false, oauthRequestValid: false, requestLog: [] };
  async function install(page) {
    page.on("Fetch.requestPaused", async ({ requestId, request }) => {
      const url = new URL(request.url);
      state.requestLog.push(`${request.method} ${url.pathname}`);
      const contentType = Object.entries(request.headers).find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? "";
      const body = request.postData && contentType.includes("application/json") ? JSON.parse(request.postData) : {};
      const headers = [
        { name: "Content-Type", value: "application/json" },
        { name: "X-Supabase-Api-Version", value: "2024-01-01" },
        { name: "Access-Control-Allow-Origin", value: origin },
        { name: "Access-Control-Allow-Headers", value: "*" },
        { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
        { name: "Access-Control-Expose-Headers", value: "*" },
      ];
      const reply = (value, status = 200, extraHeaders = []) => page.send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [...headers, ...extraHeaders], body: Buffer.from(status === 204 || request.method === "HEAD" ? "" : JSON.stringify(value)).toString("base64") });
      if (request.method === "OPTIONS") { await reply({}); return; }
      if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
      const failure = (code = "unexpected_failure", status = 400) => reply({ code, error_code: code, msg: "Synthetic request failure", message: "Synthetic request failure" }, status);
      if (url.pathname.endsWith("/settings")) { await reply({ external: { google: state.google, email: true } }); return; }
      if (url.pathname.endsWith("/authorize")) {
        counts.oauth++;
        state.oauthRequestValid = url.searchParams.get("redirect_to") === `${origin}/auth/callback` && Boolean(url.searchParams.get("code_challenge"));
        await page.send("Fetch.fulfillRequest", { requestId, responseCode: 302, responseHeaders: [{ name: "Location", value: `${origin}/auth/callback?code=synthetic-google-return` }] });
        return;
      }
      if (url.pathname.endsWith("/signup")) {
        counts.signup++;
        signupMetadata.set(state.account, body.data ?? {});
        if (state.signupSession) await reply(session(state.account, false, signupMetadata.get(state.account)));
        else await reply({ ...user(state.account, signupMetadata.get(state.account)), email_confirmed_at: null, confirmed_at: null });
        return;
      }
      if (url.pathname.endsWith("/recover")) { counts.reset++; await reply({}); return; }
      if (url.pathname.endsWith("/resend")) { counts.resend++; await (state.resendError ? failure("over_email_send_rate_limit", 429) : reply({})); return; }
      if (url.pathname.endsWith("/verify")) { counts.verify++; await (state.otpError ? failure("otp_expired") : reply(session(state.account))); return; }
      if (url.pathname.endsWith("/token")) {
        const grant = url.searchParams.get("grant_type");
        if (grant === "password") { counts.password++; await (state.loginError ? failure(state.loginError) : reply(session(state.account))); return; }
        if (grant === "pkce") { counts.exchange++; await (state.exchangeError ? failure("flow_state_expired") : reply(session(state.account))); return; }
        if (grant === "refresh_token") { counts.refresh++; await (state.refreshError ? failure("refresh_token_not_found") : reply(session(state.account))); return; }
      }
      if (url.pathname.endsWith("/user") && request.method === "PUT") { counts.passwordUpdate++; await reply(user(state.account, signupMetadata.get(state.account))); return; }
      if (url.pathname.endsWith("/user")) { counts.user++; await (state.userError ? failure("bad_jwt", 401) : reply(user(state.account, signupMetadata.get(state.account)))); return; }
      if (url.pathname.endsWith("/logout")) { counts.logout++; await reply(null, 204); return; }
      if (url.pathname === "/rest/v1/profiles") {
        const id = url.searchParams.get("id")?.replace(/^eq\./, "") ?? body.id;
        if (id !== state.account) { counts.forbidden++; await failure("forbidden", 403); return; }
        if (request.method === "GET") {
          if (state.readError) { await failure("forbidden", 403); return; }
          const row = rows.get(id);
          const object = Object.entries(request.headers).some(([key, value]) => key.toLowerCase() === "accept" && value.includes("vnd.pgrst.object"));
          await reply(object ? row ?? null : row ? [row] : []); return;
        }
        if (request.method === "POST") { counts.provision++; if (!rows.has(id)) rows.set(id, { ...profile(id), display_name: body.display_name ?? null }); await reply(null, 201); return; }
        if (request.method === "PATCH") {
          counts.update++;
          if (state.saveError) { await failure("forbidden", 403); return; }
          rows.set(id, { ...rows.get(id), ...body }); await reply(rows.get(id)); return;
        }
      }
      if (handleData && await handleData({ request, requestId, page, url, body, reply, failure, account: state.account })) return;
      if (["wardrobe_items", "saved_outfits", "outfit_items"].some((name) => url.pathname === `/rest/v1/${name}`)
          && ["GET", "HEAD"].includes(request.method)) { await reply([]); return; }
      counts.forbidden++; await failure("unsupported_fixture_request", 403);
    });
    await page.send("Fetch.enable", { patterns: [{ urlPattern: "*supabase.co/*", requestStage: "Request" }, ...extraPatterns.map((urlPattern) => ({ urlPattern, requestStage: "Request" }))] });
  }
  return { rows, state, counts, install };
}
