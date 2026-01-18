// src/utils/googleOAuth.ts
import axios from "axios";
import { envVars } from "../config/env";

// Use centralized env vars from env.ts
const GOOGLE_CLIENT_ID = envVars.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = envVars.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = envVars.GOOGLE_OAUTH_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth environment variables missing");
}

/**
 * REQUIRED SCOPES for Google Ads OAuth and Google Meet
 */
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.events", // For creating events with conferencing
  "https://www.googleapis.com/auth/adwords", // REQUIRED for Google Ads API
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
].join(" ");

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",           // REQUIRED: returns refresh token
    prompt: "consent",                // REQUIRED: forces refresh token
    include_granted_scopes: "true",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeCodeForTokens(code: string) {
  console.log("\n🔐 Exchanging authorization code for tokens...");

  try {
    const body = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
      include_granted_scopes: "true",
    });

    console.log("📡 Sending token request to Google OAuth...");
    console.log("🔗 Redirect URI:", REDIRECT_URI);

    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      body.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("✅ Successfully received tokens from Google");
    console.log("📦 Token data:", {
      access_token: response.data.access_token ? `${response.data.access_token.substring(0, 10)}...` : 'none',
      refresh_token: response.data.refresh_token ? 'present' : 'missing',
      expires_in: response.data.expires_in,
      scope: response.data.scope,
    });

    return response.data;
  } catch (err: any) {
    console.error("\n🔥 ============ OAUTH TOKEN EXCHANGE ERROR ============ 🔥");
    console.error("❌ Error Type:", err.constructor.name);
    console.error("❌ Error Message:", err.message);

    if (err.response) {
      console.error("📡 HTTP Status:", err.response.status);
      console.error("📦 Response Data:", JSON.stringify(err.response.data, null, 2));
    }

    console.error("🔥 ==================================================== 🔥\n");

    const errorDesc = err.response?.data?.error_description || err.response?.data?.error || err.message;
    throw new Error(`Failed to exchange code for tokens: ${errorDesc}`);
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  console.log("\n🔄 Refreshing access token...");

  try {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    });

    console.log("📡 Sending refresh token request to Google OAuth...");

    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      body.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("✅ Successfully refreshed access token");
    console.log("📦 New token expires in:", response.data.expires_in, "seconds");

    return response.data;
  } catch (err: any) {
    console.error("\n🔥 ============ OAUTH TOKEN REFRESH ERROR ============ 🔥");
    console.error("❌ Error Type:", err.constructor.name);
    console.error("❌ Error Message:", err.message);

    if (err.response) {
      console.error("📡 HTTP Status:", err.response.status);
      console.error("📦 Response Data:", JSON.stringify(err.response.data, null, 2));

      // Common refresh token errors
      if (err.response.status === 400) {
        const errorType = err.response.data?.error;
        if (errorType === 'invalid_grant') {
          console.error("⚠️ Refresh token is invalid or expired. User needs to re-authenticate.");
        }
      }
    }

    console.error("🔥 ==================================================== 🔥\n");

    const errorDesc = err.response?.data?.error_description || err.response?.data?.error || err.message;
    throw new Error(`Failed to refresh Google tokens: ${errorDesc}`);
  }
}
