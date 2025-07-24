import { OAuth, getPreferenceValues } from "@raycast/api";
import { people } from "@googleapis/people";
import { OAuth2Client } from "google-auth-library";

interface Preferences {
  googleClientId: string;
  googleClientSecret: string;
}

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account to access your contacts",
});

export async function authorize(): Promise<string> {
  console.log("AUTH: Starting authorization...");
  const preferences = getPreferenceValues<Preferences>();
  const clientId = preferences.googleClientId;

  // Check for existing tokens first
  console.log("AUTH: Checking for existing tokens...");
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    console.log("AUTH: Found existing token, checking if expired...");
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      console.log("AUTH: Token expired, refreshing...");
      const tokens = await refreshTokens(tokenSet.refreshToken, clientId);
      await oauthClient.setTokens(tokens);
      return tokens.access_token;
    }
    console.log("AUTH: Using existing valid token");
    return tokenSet.accessToken;
  }

  console.log("AUTH: No existing tokens, starting new authorization...");

  try {
    // Create authorization request
    console.log("AUTH: Creating authorization request...");
    const authRequest = await oauthClient.authorizationRequest({
      endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      clientId: clientId,
      scope: "https://www.googleapis.com/auth/contacts.readonly",
    });

    console.log("AUTH: Authorization request created, calling authorize...");
    console.log("AUTH: Auth URL being used:", authRequest.toURL ? authRequest.toURL() : "No URL available");
    console.log("AUTH: Redirect URI in request:", authRequest.redirectURI);
    
    const { authorizationCode } = await oauthClient.authorize(authRequest);

    console.log("AUTH: Got authorization code, fetching tokens...");
    const tokens = await fetchTokens(authRequest, authorizationCode);

    console.log("AUTH: Tokens received, storing...");
    await oauthClient.setTokens(tokens);

    console.log("AUTH: Authorization complete!");
    return tokens.access_token;
  } catch (error) {
    console.error("AUTH: Authorization failed:", error);
    throw error;
  }
}

async function fetchTokens(
  request: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const params = new URLSearchParams();
  params.append("client_id", request.clientId);
  params.append("client_secret", preferences.googleClientSecret);
  params.append("code", authCode);
  params.append("code_verifier", request.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", "https://raycast.com/redirect/extension");

  console.log("AUTH: Token exchange parameters:", {
    client_id: request.clientId ? "Present" : "Missing",
    client_secret: preferences.googleClientSecret ? "Present" : "Missing",
    code: authCode ? "Present" : "Missing",
    code_verifier: request.codeVerifier ? "Present" : "Missing",
    redirect_uri: "https://raycast.com/redirect/extension",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token fetch failed:", response.status, response.statusText);
    console.error("Error response:", errorText);
    throw new Error(
      `Failed to fetch OAuth tokens: ${response.statusText} - ${errorText}`
    );
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(
  refreshToken: string,
  clientId: string
): Promise<OAuth.TokenResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", preferences.googleClientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    console.error(
      "Token refresh failed:",
      response.status,
      response.statusText
    );
    throw new Error(`Failed to refresh OAuth tokens: ${response.statusText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

export function createPeopleService(accessToken: string) {
  // Create an OAuth2 client with the access token
  const authClient = new OAuth2Client();
  authClient.setCredentials({
    access_token: accessToken,
  });

  return people({
    version: "v1",
    auth: authClient,
  });
}
