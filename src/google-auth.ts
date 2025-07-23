import { OAuth, getPreferenceValues } from "@raycast/api";
import { google } from "googleapis";

interface Preferences {
  googleClientId: string;
}

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

let oauthClient: OAuth.PKCEClient | null = null;

function getOAuthClient(): OAuth.PKCEClient {
  if (!oauthClient) {
    oauthClient = new OAuth.PKCEClient({
      redirectUri: "https://raycast.com/redirect?packageName=Extension",
      description: "Connect your Google account to access your contacts",
    });
  }
  return oauthClient;
}

export async function authorize(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const client = getOAuthClient();
  
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await client.refreshTokens());
      return client.getTokens()?.accessToken ?? "";
    }
    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: preferences.googleClientId,
    scope: GOOGLE_SCOPES.join(" "),
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.exchangeCodeForTokens(authRequest, authorizationCode);

  return client.getTokens()?.accessToken ?? "";
}

export function createPeopleService(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  return google.people({ version: "v1", auth });
}