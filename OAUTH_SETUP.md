# OAuth Login Setup

## 1. Google Login

### Google Cloud Console
1. https://console.cloud.google.com/
2. APIs & Services -> Credentials -> Create OAuth 2.0 Client ID
3. Web application, name: gate-in
4. Authorized redirect URI:
   ```
   https://iysrcqfknuofpjpewgfr.supabase.co/auth/v1/callback
   ```
5. Copy Client ID + Client Secret

### Supabase
1. Authentication -> Providers -> Google -> Enable
2. Paste Client ID + Client Secret -> Save

## 2. X (Twitter) Login

### X Developer Portal
1. https://developer.twitter.com/en/portal/dashboard
2. User authentication settings -> Set up
3. Callback URI:
   ```
   https://iysrcqfknuofpjpewgfr.supabase.co/auth/v1/callback
   ```
4. Website URL: https://gate-in.jp

### Supabase
1. Authentication -> Providers -> Twitter -> Enable
2. Paste API Key + API Secret Key -> Save

## 3. Checklist
- [ ] Google OAuth consent screen = Published
- [ ] X App = Production
- [ ] Supabase Site URL = https://gate-in.jp
- [ ] Supabase Redirect URLs includes https://gate-in.jp/auth/callback
