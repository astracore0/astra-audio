# Astra Audio

Astra Audio is a small, ad-free, client-side music player for GitHub Pages. It has no backend, account, subscription, API key, build step, or external CSS/icon dependency.

## Music and licensing

Search and radio use the Wikimedia Commons API and show tracks marked with an open license or public-domain status. Each result links to its Commons source and license when available. Check the source page for the exact terms and attribution requirements before reusing or redistributing a recording.

This is an open-music catalogue, not a way to stream every commercial release. Catalogue availability, playback formats, and regional access depend on the source and your browser. The app is free and contains no advertising.

## Features

- Search track titles, contributors, instruments, moods, and descriptions with local token-based ranking.
- Browse mood shortcuts, save favourites, and build a playback queue.
- Continue with related open tracks using radio when the queue is empty.
- Stream only after the listener presses Play; search requests track metadata and artwork, not audio.
- Seek through a track, see playback/buffer progress, and control volume.
- Restore the selected section, query, scroll position, saved tracks, queue, and player selection from this browser's local storage.
- Uses inline SVG icons and embedded responsive CSS; the page is a single `index.html`.

Search is not generative AI and does not send queries to an AI provider. Ranking runs in the browser, avoiding AI API keys, costs, and disclosure of search terms to an additional service.

## Run and publish

Open `index.html` in a modern browser or serve the repository as static files. For GitHub Pages, select **GitHub Actions** as the Pages source; `.github/workflows/pages.yml` publishes the site.

The site needs an internet connection to search Commons and retrieve remote audio. Search calls time out after 4.5 seconds and show an error instead of leaving a spinner running.
