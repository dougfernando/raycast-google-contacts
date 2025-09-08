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

  if (!clientId || !preferences.googleClientSecret) {
    throw new Error("Google OAuth credentials not configured. Please set Client ID and Client Secret in preferences.");
  }

  // Check for existing tokens first
  console.log("AUTH: Checking for existing tokens...");
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    console.log("AUTH: Found existing token, checking if expired...");
    console.log("AUTH: Token details:", {
      hasAccessToken: !!tokenSet.accessToken,
      hasRefreshToken: !!tokenSet.refreshToken,
      isExpired: tokenSet.isExpired?.() || 'unknown',
      expiresAt: tokenSet.expiresAt || 'unknown'
    });
    
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      console.log("AUTH: Token expired, refreshing...");
      try {
        const tokens = await refreshTokens(tokenSet.refreshToken, clientId);
        await oauthClient.setTokens(tokens);
        return tokens.access_token;
      } catch (error) {
        console.error("AUTH: Token refresh failed, clearing tokens and reauthorizing:", error);
        await oauthClient.setTokens(null);
        // Fall through to new authorization
      }
    } else if (!tokenSet.isExpired()) {
      console.log("AUTH: Using existing valid token");
      return tokenSet.accessToken;
    }
  }

  console.log("AUTH: No existing tokens, starting new authorization...");

  try {
    // Create authorization request
    console.log("AUTH: Creating authorization request...");
    const authRequest = await oauthClient.authorizationRequest({
      endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      clientId: clientId,
      scope: "https://www.googleapis.com/auth/contacts.readonly",
      extraParameters: {
        redirect_uri: "https://raycast.com/redirect/extension",
      },
    });

    // Add client ID to authRequest since it's not automatically included
    (authRequest as any).clientId = clientId;
    
    // Ensure redirect URI is correctly set for token exchange
    (authRequest as any).redirectURI = "https://raycast.com/redirect/extension";

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
  params.append("redirect_uri", request.redirectURI);

  console.log("AUTH: Token exchange parameters:", {
    client_id: request.clientId ? "Present" : "Missing",
    client_secret: preferences.googleClientSecret ? "Present" : "Missing",
    code: authCode ? "Present" : "Missing",
    code_verifier: request.codeVerifier ? "Present" : "Missing",
    redirect_uri: request.redirectURI,
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

  const tokens = (await response.json()) as OAuth.TokenResponse;
  
  // Log token details for debugging (without exposing actual tokens)
  console.log("AUTH: Token response received:", {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
  });

  return tokens;
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

  console.log("AUTH: Refreshing tokens with:", {
    client_id: clientId ? "Present" : "Missing",
    client_secret: preferences.googleClientSecret ? "Present" : "Missing",
    refresh_token: refreshToken ? "Present" : "Missing",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh failed:", response.status, response.statusText);
    console.error("Refresh error response:", errorText);
    throw new Error(`Failed to refresh OAuth tokens: ${response.statusText} - ${errorText}`);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  
  console.log("AUTH: Token refresh successful:", {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresIn: tokens.expires_in,
  });

  return tokens;
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

let currentContactsService: any = null;

export function setCurrentContactsService(service: any) {
  currentContactsService = service;
}

export async function withAuthRetry<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    // Check if it's a 401 authentication error
    if (error?.code === 401 || error?.status === 401) {
      console.log("AUTH: 401 error detected, clearing tokens and retrying...");
      
      // Clear existing tokens
      await oauthClient.setTokens(null);
      
      // If we have a reference to the contacts service, refresh it
      if (currentContactsService && typeof currentContactsService.refreshService === 'function') {
        await currentContactsService.refreshService();
      }
      
      // Retry the API call with new authentication
      console.log("AUTH: Retrying API call with fresh token...");
      return await apiCall();
    }
    
    // If it's not a 401 error, re-throw
    throw error;
  }
}
