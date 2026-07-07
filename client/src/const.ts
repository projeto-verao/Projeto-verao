export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUrl = `${window.location.origin}/api/oauth/callback`;
  
  // Encode origin and return path in state as JSON
  const state = JSON.stringify({
    origin: window.location.origin,
    returnPath: returnPath || "/",
  });

  const url = new URL(`${oauthPortalUrl || 'http://localhost:3000'}/login`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("redirect_url", redirectUrl);
  url.searchParams.set("state", state);

  return url.toString();
};
