# Astra Audio

Astra Audio is an independent-music discovery player with search, browser-saved library, playlists, queue, shuffle/repeat, volume, and a 3-band equalizer. It uses Jamendo's API as a discovery source for tracks published under Creative Commons licences. It is not affiliated with Spotify.

## Important about ads and rights

The interface contains no advertising placements or ad SDK. The music catalogue is Jamendo, not Spotify. Jamendo states that API tracks are published under Creative Commons licences; each track's licence must be checked for the intended use. This project does not guarantee that a provider's delivery, account experience, or third-party infrastructure is always ad-free. The player only streams the audio URL supplied by the catalogue and does not download or re-host music.

## Architecture

- GitHub Pages serves `index.html`, `style.css`, and `app.js`.
- A separate Python/Flask backend calls Jamendo's API so the API client ID stays server-side.
- Library and playlists are stored in the browser using localStorage.
- Audio is streamed from the catalogue-provided URL. It is not cached by this starter backend.

## 1. Set up Jamendo API access

Create an app in the [Jamendo developer portal](https://developer.jamendo.com/) and read the current API terms. Store its client ID as an environment variable named `JAMENDO_CLIENT_ID` on your backend host. Do not put a private key in frontend JavaScript or commit it to GitHub. Confirm your intended public use is permitted by Jamendo's current API terms and each track's licence.

## 2. Deploy the backend

Deploy the `backend/` directory to a Python hosting service that supports Flask/Gunicorn. Set:
- `JAMENDO_CLIENT_ID` = your Jamendo app client ID
- `ALLOWED_ORIGINS` = your GitHub Pages origin, for example `https://YOUR-USERNAME.github.io` (comma-separated if needed)

The service must provide HTTPS. Test `https://YOUR-BACKEND/api/health`; it should return `ok: true` and `catalogue_configured: true`.

## 3. Connect the frontend

Copy `config.example.js` to `config.js`, change `apiBase` to the deployed backend's HTTPS URL, and include the config script before `app.js` in `index.html`:
```html
<script src="config.js"></script>
<script src="app.js"></script>
```
Commit `config.js` only if it contains the public backend URL; never put API secrets there.

## 4. Publish on GitHub Pages

1. Create a GitHub repository and upload the root project files and `.github/workflows/pages.yml`.
2. Open Settings → Pages and choose GitHub Actions as the source.
3. Push to `main` or run the workflow manually.
4. Open the URL shown in the workflow deployment.

## Current limitations

- The backend provides catalogue search and track metadata/audio URLs; it does not implement user accounts, cloud-synced playlists, server-side audio caching, or paid catalogue subscriptions.
- Some tracks may not allow every use. Check each returned `license` URL and follow attribution/share requirements.
- Browser EQ may not work for every cross-origin stream. Background playback and autoplay are subject to browser and device restrictions.
- This is a starter application, not a commercial music service. A full commercial catalogue requires direct agreements with rights holders or a provider that explicitly licenses that use.
