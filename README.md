# Astra Audio — GitHub Pages edition

A responsive HTML/CSS/JavaScript music discovery web app. It runs as a static site on GitHub Pages and does not require Python, Termux, Node.js, a backend server, or an API key.

## Features
- Responsive layout for phones, tablets, laptops, and desktops
- Custom inline SVG icons (no emoji iconography or icon font)
- Search tracks, artists, and albums using the iTunes Search API
- Regional most-played charts using Apple's public RSS feed
- Play available official preview clips, seek, volume, next/previous, shuffle, repeat
- Save tracks to a browser-local library
- Queue management and locally stored playlists
- Bass/mid/treble equalizer using Web Audio API when supported
- No ads inserted by this app; the app does not control third-party provider policies

## Publish with the GitHub website (no terminal)
1. Download and extract `astra-audio-github.zip` on your device.
2. Open your GitHub repository in a browser.
3. Choose **Add file → Upload files**.
4. Upload `index.html`, `style.css`, `app.js`, and the `assets` folder contents to the repository root. Do not upload the ZIP itself as the website.
5. Commit the changes.
6. Open **Settings → Pages** and select **GitHub Actions** as the build source.
7. The repository must include `.github/workflows/pages.yml`. If you do not want to upload that workflow, choose **Deploy from a branch**, select `main` and `/ (root)` instead.
8. Wait for the Pages deployment to finish, then open the URL displayed under Settings → Pages.

## Music and preview limitations
This version uses Apple's public iTunes Search and RSS chart endpoints. Track search and preview availability vary by country and catalogue. Most preview URLs are short samples, not full songs. This is not a full-song streaming service, and it cannot guarantee that every search result has a playable preview. To offer full-length music, integrate a provider that explicitly licenses that playback model; this cannot be achieved by GitHub Pages alone.

## Storage
Library, playlists, and preferences are stored in localStorage in the current browser. They do not sync across devices and may be cleared if browser data is cleared.

## If results do not load
- Make sure the browser has internet access.
- Try another search term or region.
- Some networks, browser privacy settings, or provider outages can block public API requests.
- GitHub Pages serves the site over HTTPS. Provider endpoints are HTTPS too.
