/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Google OAuth Client ID - Your Google OAuth 2.0 Client ID from Google Cloud Console */
  "googleClientId": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-contacts` command */
  export type SearchContacts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-contacts` command */
  export type SearchContacts = {}
}

