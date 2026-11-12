/**
 * MOCKED Supabase HTTP journey in real Chromium, not a hosted-auth verification.
 * node --experimental-websocket scripts/auth.browser.mjs
 */
import assert from "node:assert/strict";
import { createBrowserHarness, pause } from "./lib/browserHarness.mjs";
import { createAuthFixtures, accountA, accountB, profile, session } from "./lib/authFixtures.mjs";
const h = await createBrowserHarness();
const fixture = createAuthFixtures(h.origin);
await fixture.install(h.page);
const { check, contains, click, fill, navigate, reload, evaluate } = h;
async function signedOut() {
  await navigate("/auth/sign-in");
  await evaluate("localStorage.removeItem('silvet.auth.v1')");
  await reload();
  await check("Signed-out sign-in form loads", "Boolean(document.querySelector('input[autocomplete=\"current-password\"]'))");
}
async function login() {
  await fill("Email address", "fixture-a@example.com"); await fill("Password", "synthetic-password");
  await click("Sign in");
}
try {
  await navigate("/demo/wardrobe");
  await check("Public demo works without authentication", contains("My wardrobe"));
  await evaluate("sessionStorage.setItem('auth-regression-demo-marker','keep')");
  await navigate("/app/style?mode=ideas");
  await check("Protected links redirect to login with continuation", "location.pathname==='/auth/sign-in' && new URLSearchParams(location.search).get('next')==='/app/style?mode=ideas'");
  await check("Google is gracefully unavailable before configuration", `${contains("Google sign-in is not enabled")} && [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue with Google')).disabled`);
  await click("Sign in");
  await check("Invalid form focuses email without sending a password request", "document.activeElement?.type==='email'");
  assert.equal(fixture.counts.password, 0);
  fixture.state.loginError = "invalid_credentials";
  await login();
  await check("Invalid credentials display a safe error", contains("email or password is incorrect"));
  fixture.state.loginError = "email_not_confirmed";
  await login();
  await check("Existing unverified account opens legacy verification", contains("Verify this email address"));
  await click("Back to sign in");
  await navigate("/auth/sign-up?next=%2Fapp%2Fstyle%3Fmode%3Dideas");
  await check("Signup is available", contains("Create a password"));
  await fill("Your name", "New fixture"); await fill("Email address", "fixture-a@example.com"); await fill("Create a password", "synthetic-password");
  fixture.state.signupSession = true;
  fixture.state.delay = 300;
  await evaluate(`(() => { const form=document.querySelector('form'); form.requestSubmit(); form.requestSubmit(); })()`);
  await check("Immediate signup session opens onboarding", contains("Make this space feel like yours"));
  fixture.state.delay = 0;
  assert.equal(fixture.counts.signup, 1);
  assert.equal(fixture.counts.provision, 1);
  await check("Signup name is provisioned and prefilled for onboarding", `document.querySelector('input[autocomplete="name"]').value==='New fixture'`);
  await check("Signup duplicate submission sends only one request", "location.pathname==='/onboarding'");
  assert.equal(fixture.counts.provision, 1);
  for (const width of [360, 768]) {
    await h.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await check(`Onboarding fits ${width}px without horizontal overflow`, "document.documentElement.scrollWidth<=innerWidth+1");
  }
  await h.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  fixture.state.saveError = true;
  await fill("What should we call you?", "Saved fixture");
  await click("Traditional"); await click("Indo-western fusion");
  await click("Save and continue");
  await check("Onboarding failure retains name and style selections", `${contains("entries are still here")} && document.querySelector('input[autocomplete=\"name\"]').value==='Saved fixture' && [...document.querySelectorAll('[aria-pressed=\"true\"]')].length===2`);
  fixture.state.saveError = false;
  await click("Save and continue");
  await check("Onboarding resumes the safely requested destination", "location.pathname==='/app/style' && location.search==='?mode=ideas'");
  await click("Profile");
  await check("Onboarding success reaches the account summary", `${contains("Your profile")} && ${contains("Saved fixture")} && ${contains("Traditional")}`);
  assert.deepEqual(fixture.rows.get(accountA).style_preferences, ["traditional", "fusion"]);
  await fill("Display name", "Updated fixture");
  await click("Minimal");
  fixture.state.saveError = true;
  await click("Save profile");
  await check("Profile edit error retains entered changes", `${contains("profile wasn’t saved")} && document.querySelector('input[autocomplete="name"]').value==='Updated fixture'`);
  assert.equal(fixture.rows.get(accountA).display_name, "Saved fixture");
  fixture.state.saveError = false;
  await click("Save profile");
  await check("Profile edits save display name and style preference", `${contains("Your profile is saved")} && ${contains("Updated fixture")}`);
  assert.equal(fixture.rows.get(accountA).display_name, "Updated fixture");
  assert.deepEqual(fixture.rows.get(accountA).style_preferences, ["traditional", "fusion", "minimal"]);
  await check("Profile lives inside the authenticated app shell", "Boolean(document.querySelector('nav[aria-label=\"Main\"]')) && location.pathname==='/app/profile'");
  await reload();
  await check("Reload restores session without overwriting preferences", `${contains("Your profile")} && ${contains("Updated fixture")}`);
  assert.equal(fixture.counts.provision, 1);
  await click("Personal wardrobe");
  await check("Personal wardrobe is empty, never seeded with sample clothes", `${contains("A wardrobe begins with one.")} && !${contains("Demo wardrobe")}`);
  await navigate("/app/style?mode=ideas");
  await check("Personal Studio and Ideas do not mount DemoRepository", `${contains("A complete look needs a little more")} && !${contains("Demo wardrobe")}`);
  await navigate("/app/lookbook");
  await check("Personal Lookbook loads without demo outfits", `${contains("Lookbook")} && !${contains("Demo wardrobe")}`);
  await navigate("/app/profile");
  await click("Sign out");
  await navigate("/app/profile");
  await check("Logout protects authenticated routes", "location.pathname==='/auth/sign-in'");
  await check("Logout preserves demo session storage", "sessionStorage.getItem('auth-regression-demo-marker')==='keep'");
  fixture.rows.set(accountA, { ...profile(accountA), display_name: "Keep existing", style_preferences: ["fusion"] });
  fixture.state.loginError = null;
  await login();
  await check("Incomplete existing profile resumes onboarding", contains("Make this space feel like yours"));
  await fill("What should we call you?", "Do not save this");
  await click("Traditional");
  await click("Skip for now");
  await check("Skip completes onboarding while preserving existing preferences", `${contains("Your profile")} && ${contains("Keep existing")} && ${contains("Indo-western fusion")} && !${contains("Do not save this")}`);
  assert.equal(fixture.rows.get(accountA).display_name, "Keep existing");
  assert.deepEqual(fixture.rows.get(accountA).style_preferences, ["fusion"]);
  assert(fixture.rows.get(accountA).onboarding_completed_at);
  await click("Sign out");
  await navigate("/auth/sign-in?next=https%3A%2F%2Fevil.example");
  await login();
  await check("An external next URL cannot redirect off-site", "location.pathname==='/app/profile'");
  await click("Sign out");
  fixture.state.signupSession = false;
  await navigate("/auth/sign-up");
  await fill("Your name", "No session fixture"); await fill("Email address", "fixture-b@example.com"); await fill("Create a password", "synthetic-password");
  await click("Create account");
  await check("Signup without a session is explicit and does not open the app", `${contains("No sign-in session was returned")} && ${contains("SILVET has not signed you in")} && !location.pathname.startsWith('/app/')`);
  await navigate("/auth/sign-in");
  fixture.state.readError = true;
  await login();
  await check("Profile read failure offers retry without creating default data", contains("load your profile"));
  const before = fixture.counts.provision;
  fixture.state.readError = false;
  await click("Try again");
  await check("Profile retry restores existing data", contains("Keep existing"));
  assert.equal(fixture.counts.provision, before);
  await click("Sign out");
  await navigate("/auth/sign-in");
  await evaluate("localStorage.setItem('silvet.auth.v1',JSON.stringify(" + JSON.stringify(session(accountA, true)) + "))");
  fixture.state.refreshError = true;
  await navigate("/app/profile");
  await check("Expired unrecoverable session returns to sign-in", "location.pathname==='/auth/sign-in'");
  fixture.state.refreshError = false;
  await login();
  await check("A fresh login recovers after expiration", contains("Keep existing"));
  // Switch the persisted account and reload: no old account's profile may be reused.
  fixture.state.account = accountB;
  fixture.rows.set(accountB, { ...profile(accountB, true), display_name: "Second fixture", style_preferences: ["casual"] });
  await evaluate("localStorage.setItem('silvet.auth.v1',JSON.stringify(" + JSON.stringify(session(accountB)) + "))");
  await reload();
  await check("Account switching isolates profile cache and identity", `${contains("Second fixture")} && !${contains("Keep existing")} && ![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Indo-western fusion' && b.getAttribute('aria-pressed')==='true')`);
  fixture.rows.get(accountB).display_name = "X".repeat(80);
  await reload();
  for (const width of [360, 768]) {
    await h.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await check(`Profile handles an 80-character name at ${width}px`, "document.documentElement.scrollWidth<=innerWidth+1");
  }
  await h.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  // A second actual tab shares the browser's session and sends SDK sign-out broadcasts.
  const other = await h.secondPage();
  await fixture.install(other);
  await other.send("Page.navigate", { url: h.origin + "/app/profile" });
  let otherReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { otherReady = await other.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Sign out')"); if (otherReady) break; } catch { /* Page is loading. */ }
    await pause();
  }
  assert(otherReady, "Second authenticated tab became ready");
  await other.evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Sign out')).click()");
  await check("Sign-out in another tab protects this tab too", "location.pathname==='/auth/sign-in'");
  await navigate("/auth/callback?error=access_denied");
  await check("OAuth cancellation is handled and URL parameters removed", `${contains("cancelled")} && location.search===''`);
  fixture.state.account = accountA;
  await signedOut();
  await evaluate("sessionStorage.setItem('silvet.auth.next.v1','/app/lookbook');localStorage.setItem('silvet.auth.v1-code-verifier',JSON.stringify('synthetic-verifier'))");
  fixture.state.exchangeError = true;
  await navigate("/auth/callback?code=synthetic-expired-code");
  await check("Expired callback is recoverable without exposing the code", `${contains("expired")} && location.search===''`);
  const exchanges = fixture.counts.exchange;
  fixture.state.exchangeError = false;
  await evaluate("localStorage.setItem('silvet.auth.v1-code-verifier',JSON.stringify('synthetic-verifier'))");
  await navigate("/auth/callback?code=synthetic-valid-code");
  await check("Confirmation callback establishes a session once", contains("Your profile"));
  assert.equal(fixture.counts.exchange, exchanges + 1);
  await click("Sign out");
  await navigate("/auth/reset-password");
  await fill("Email", "fixture-a@example.com");
  await click("Send reset link");
  await check("Password reset request shows account-safe confirmation", contains("If an account exists"));
  assert.equal(fixture.counts.reset, 1);
  await navigate("/auth/sign-in");
  await check("Sign-in offers password recovery", contains("Forgot password?"));
  await evaluate("localStorage.setItem('silvet.auth.v1-code-verifier',JSON.stringify('synthetic-recovery-verifier/recovery'))");
  await navigate("/auth/update-password?code=synthetic-recovery-code");
  await check("Recovery link opens the set-new-password form", contains("Choose a new password"));
  await fill("New password", "new-synthetic-password");
  await fill("Confirm new password", "new-synthetic-password");
  await click("Save new password");
  await check("Verified recovery session saves the new password", contains("Password updated"));
  assert.equal(fixture.counts.passwordUpdate, 1);
  await navigate("/auth/update-password?code=ordinary-code");
  await check("Invalid recovery links do not show a password form", `${contains("reset link")} && !document.querySelector('input[autocomplete="new-password"]')`);
  await navigate("/app/profile");
  await click("Sign out");
  fixture.state.google = true;
  await navigate("/auth/sign-in");
  await check("Configured provider enables Google without another library", `[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Continue with Google') && !b.disabled)`);
  await click("Continue with Google");
  await check("Mock Google OAuth completes PKCE and returns to the account", contains("Keep existing"));
  assert.equal(fixture.counts.oauth, 1);
  assert(fixture.state.oauthRequestValid, "OAuth uses the same-origin callback with a PKCE challenge");
  await click("Sign out");
  await navigate("/auth/sign-in");
  await check("Sign-in screen is ready for responsive checks", contains("Welcome back"));
  for (const width of [360, 768, 1280]) {
    await h.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await check(`Auth fits ${width}px without horizontal overflow`, "document.documentElement.scrollWidth<=innerWidth+1");
  }
  assert.equal(fixture.counts.forbidden, 0, "No unexpected hosted-data request was attempted");
  assert.equal(h.errors.length, 0, "No uncaught browser or fixture errors");
  console.log(JSON.stringify({ result: "passed", checks: h.checks.length, mockedSupabase: true, hostedAuthVerified: false, browserErrors: h.errors }, null, 2));
} finally { await h.close(); }
