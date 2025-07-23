# Google Contacts Raycast Extension

A Raycast extension to search and manage your Google Contacts directly from Raycast.

## Features

- 🔍 Search through all your Google Contacts
- 👤 View detailed contact information
- 📧 Quick email actions
- 📞 Copy phone numbers to clipboard
- 🔄 Real-time search using Google People API
- 🔐 Secure OAuth authentication

## Setup

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **People API**:
   - Navigate to APIs & Services > Library
   - Search for "People API" (this is the current API for Google Contacts)
   - Click on it and enable it
4. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add `https://raycast.com/redirect` to "Authorized redirect URIs"
   - Save the Client ID

### 2. Extension Configuration

1. Install the extension in Raycast
2. Open Raycast preferences and find "Google Contacts"
3. Enter your Google OAuth Client ID in the preferences

### 3. First Use

1. Run the "Search Contacts" command
2. You'll be prompted to authenticate with Google
3. Grant permission to access your contacts
4. Start searching your contacts!

## Usage

- Use `⌘ + Space` and type "Search Contacts" to open the extension
- Type to search through your contacts by name, email, or phone number
- Press `↵` to view contact details
- Use the action menu (`⌘ + K`) for quick actions like sending emails or copying phone numbers

## Development

### Prerequisites

- Node.js 18+
- Raycast (latest version)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Privacy

This extension only requests read-only access to your Google Contacts. No contact data is stored locally or transmitted to any third-party services other than Google's official APIs.

## License

MIT