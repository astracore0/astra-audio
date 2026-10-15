# Astra Audio

A responsive, static music player for GitHub Pages. The app runs entirely in the browser and needs no build tools, server, account, or API key.

## What it plays

- **Your audio files:** Import files you own or are authorized to play. They are stored in this browser's IndexedDB and can play at full length. Files are not uploaded. Clearing browser site data removes the local copies.
- **Catalogue previews:** Search the public Apple iTunes Search API for track, artist, and album metadata, including catalogue duration where available. Search supports normalized title, artist, and album matching; it does not search lyrics. When available, the player can play Apple's short preview clip. A preview is not a full song; this app does not use third-party stream proxies or obtain full tracks from unlicensed sources.
- **Local library and queue:** Save tracks, add tracks to the queue, and keep preferences, current track, and playback position in this browser's local storage. Local file contents use IndexedDB. Browser storage is not synced across devices.

Catalogue search does not search lyrics. Lyrics search requires an authorized lyrics provider and is not configured.

## Run locally

Open `index.html` in a modern browser or serve the repository root as static files. For GitHub Pages, select **GitHub Actions** as the Pages source; `.github/workflows/pages.yml` publishes the repository.

The app is a single self-contained `index.html`: styling and JavaScript are inline. Catalogue search and artwork use Apple's public services; metadata requests time out after 4.5 seconds, and preview audio is requested only after Play is pressed.

## Limitations

- Catalogue results and previews depend on the Apple API, network access, and regional availability.
- Full-length playback is available for user-selected local audio only, unless a properly licensed provider is integrated.
- Imported audio is stored on the current browser/device and can consume browser storage quota.
- Search metadata and preview URLs are retrieved on demand; audio is assigned to the player only after the user presses Play.
