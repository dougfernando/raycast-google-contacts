import { OAuth, getPreferenceValues } from "@raycast/api";
import { google } from "googleapis";

interface Preferences {
  googleClientId: string;
}

const GOOGLE_SCOPES = "https://www.googleapis.com/auth/contacts.readonly";

let oauthClient: OAuth.PKCEClient | null = null;

function getOAuthClient(): OAuth.PKCEClient {
  if (!oauthClient) {
    oauthClient = new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName: "Google",
      providerIcon: "google-logo.png",
      providerId: "google",
      description: "Connect your Google account to access your contacts",
    });
  }
  return oauthClient;
}

async function fetchTokens(request: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", request.clientId);
  params.append("code", authCode);
  params.append("code_verifier", request.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", request.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.statusText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string, clientId: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`OAuth token refresh failed: ${response.statusText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

export async function authorize(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const client = getOAuthClient();
  
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokens = await refreshTokens(tokenSet.refreshToken, preferences.googleClientId);
      await client.setTokens(newTokens);
      return newTokens.access_token;
    }
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: preferences.googleClientId,
    scope: GOOGLE_SCOPES,
  });

  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);

  return tokens.access_token;
}

export function createPeopleService(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  return google.people({ version: "v1", auth });
}