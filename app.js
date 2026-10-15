(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];    const ICONS = { home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', chart: '<path d="M4 19V9m6 10V5m6 14v-7m6 7H2"/>', search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>', heart: '<path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z"/>', playlist: '<path d="M4 6h12M4 11h12M4 16h7"/><path d="M18 13v8m-4-4h8"/>', queue: '<path d="M4 5h12M4 10h12M4 15h7"/><path d="M17 15v6m-3-3h6"/>', sliders: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>', menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', back: '<path d="m15 18-6-6 6-6"/>', forward: '<path d="m9 18 6-6-6-6"/>', enter: '<path d="M4 12h15m-6-6 6 6-6 6"/>', play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>', 'play-small': '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>', pause: '<path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor" stroke="none"/>', refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>', arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', previous: '<path d="M6 5v14M19 5l-10 7 10 7z" fill="currentColor" stroke="none"/>', next: '<path d="M18 5v14M5 5l10 7-10 7z" fill="currentColor" stroke="none"/>', shuffle: '<path d="m16 3 5 4-5 4M3 7h3c4 0 5 10 9 10h6M16 13l5 4-5 4M3 17h3c1.4 0 2.4-1.5 3.3-3"/>', repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>', volume: '<path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>', 'heart-filled': '<path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z" fill="currentColor"/>' };    $$('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    if (ICONS[name]) el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  });

  const FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23232e22"/></svg>';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(key, fallback) {
      try {
        const v = JSON.parse(localStorage.getItem('astra_' + key));
        return v ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('astra_' + key, JSON.stringify(value));
      } catch {
        toast('Local browser storage is full.');
      }
    }
  };

  let saved = store.get('library', []);
  let playlists = store.get('playlists', []);
  let queue = store.get('queue', []);
  let current = store.get('current_track', null);
  let queueIndex = -1;
  let shuffle = false;
  let repeat = false;
  let toastTimer;

  let activeView = store.get('last_view', 'home');
  let history = [activeView];
  let historyIndex = 0;

  const audio = $('#audio');
  let audioContext = null, bassFilter = null, midFilter = null, trebleFilter = null, sourceNode = null;

  window.addEventListener('beforeunload', (e) => {
    if (audio && !audio.paused && audio.currentTime > 0) {
      e.preventDefault();
      e.returnValue = 'Music is currently playing. Reloading will pause playback.';
      return e.returnValue;
    }
  });

  function fmt(n) {
    if (!Number.isFinite(n) || n < 0) return '0:00';
    const m = Math.floor(n / 60), s = Math.floor(n % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function empty(text) {
    return `<div class="empty-state">${esc(text)}</div>`;
  }

  function trackCard(t, { queueMode = false } = {}) {
    const isSaved = saved.some(s => s.id === t.id);
    const durationText = t.duration ? fmt(t.duration) : 'Full Track';

    return `<article class="track-card" data-track="${esc(t.id)}">
      <div class="cover-wrap">
        <img src="${esc(t.art || FALLBACK)}" alt="" loading="lazy" onerror="this.src='${FALLBACK}'">
        <button class="cover-play" data-action="play" aria-label="Play ${esc(t.title)}"><svg viewBox="0 0 24 24">${ICONS.play}</svg></button>
      </div>
      <div class="track-meta">
        <div class="track-title" title="${esc(t.title)}">${esc(t.title)}</div>
        <div class="track-sub">${esc(t.artist)}</div>
        <div class="track-time-badge">${durationText}</div>
      </div>
      <div class="track-actions">
        <button class="small-icon ${isSaved ? 'saved' : ''}" data-action="save" aria-label="${isSaved ? 'Remove from' : 'Save to'} library" title="${isSaved ? 'Remove' : 'Save'}"><svg viewBox="0 0 24 24">${isSaved ? ICONS['heart-filled'] : ICONS.heart}</svg></button>
        ${queueMode
          ? `<button class="small-icon" data-action="remove" aria-label="Remove from queue" title="Remove"><svg viewBox="0 0 24 24">${ICONS.close}</svg></button>`
          : `<button class="small-icon" data-action="queue" aria-label="Add to queue" title="Add to queue"><svg viewBox="0 0 24 24">${ICONS.plus}</svg></button>
             <button class="small-icon" data-action="add-playlist" aria-label="Add to playlist" title="Add to playlist"><svg viewBox="0 0 24 24">${ICONS.playlist}</svg></button>`
        }
        <button class="play-small-button" data-action="play" aria-label="Play"><svg viewBox="0 0 24 24">${ICONS.play}</svg></button>
      </div>
    </article>`;
  }

  function renderTracks(target, tracks, opts = {}) {
    const el = typeof target === 'string' ? $(target) : target; if (!el) return; el.innerHTML = tracks.length ? tracks.map(t => trackCard(t, opts)).join('') : empty(opts.empty \vert{}\vert{} 'Nothing here yet.'); $$('.track-card', el).forEach((c, i) => c._track = tracks[i]);
  }

  /* Saavn & iTunes Multi-Mirror Streaming Engine */
  const STREAM_APIS = [
    'https://saavn.dev/api',
    'https://jiosaavn-api-privatecvc2.vercel.app'
  ];

  async function fetchWithTimeout(url, ms = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  function cleanSaavnTrack(t) {
    const dUrls = t.downloadUrl || [];
    const bestUrl = (dUrls.find(u => u.quality === '320kbps') || dUrls.find(u => u.quality === '160kbps') || dUrls[dUrls.length - 1])?.url || '';
    const imgUrls = t.image || [];
    const bestImg = (imgUrls.find(i => i.quality === '500x500') || imgUrls[imgUrls.length - 1])?.url || FALLBACK;

    return {
      id: String(t.id || ''),
      title: (t.name || t.title || 'Untitled Track').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      artist: (t.artists?.primary?.map(a => a.name).join(', ') || t.primaryArtists || 'Unknown Artist').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      album: t.album?.name || '',
      art: bestImg,
      fullStream: bestUrl,
      duration: Number(t.duration) || 0
    };
  }

  /* Real Trending Hits via JioSaavn Trending API */
  async function fetchRealHypeTracks() {
    const cached = store.get('hype_cache', null);
    if (cached && cached.length) return cached;

    for (const base of STREAM_APIS) {
      try {
        const data = await fetchWithTimeout(`${base}/modules?language=hindi,punjabi,english`, 6000);
        const trendingList = data.data?.trending?.songs || data.data?.albums || [];
        if (trendingList.length) {
          const songs = trendingList.map(cleanSaavnTrack).filter(t => t.id && t.title);
          if (songs.length) {
            store.set('hype_cache', songs);
            return songs;
          }
        }
      } catch (e) {}
    }

    // Direct Hype search query fallback
    return await searchMusicTracks('Trending Bollywood Punjabi Hits', 25);
  }

  /* Search Engine: Matches Song Titles, Lyrics, or Artists */
  async function searchMusicTracks(query, limit = 25) {
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    const cached = store.get(cacheKey, null);
    if (cached && cached.length) return cached;

    for (const base of STREAM_APIS) {
      try {
        const data = await fetchWithTimeout(`${base}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, 6000);
        const results = data.data?.results || data.results || [];
        if (results.length) {
          const songs = results.map(cleanSaavnTrack).filter(t => t.id && t.title);
          if (songs.length) {
            store.set(cacheKey, songs);
            return songs;
          }
        }
      } catch (e) {}
    }

    // iTunes direct search fallback if Saavn instances are busy
    try {
      const itunesData = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`, 6000);
      const songs = (itunesData.results || []).map(t => ({
        id: String(t.trackId),
        title: t.trackName || 'Untitled',
        artist: t.artistName || 'Unknown Artist',
        album: t.collectionName || '',
        art: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '500x500bb') : FALLBACK,
        fullStream: t.previewUrl || '',
        duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : 0
      })).filter(t => t.id);

      if (songs.length) {
        store.set(cacheKey, songs);
        return songs;
      }
    } catch (e) {}

    return [];
  }

  /* Lazy Stream Resolver: Fetches 320kbps full stream on user click only */
  async function resolveStreamUrl(track) {
    if (track.fullStream) return track.fullStream;

    const q = `${track.title} ${track.artist}`.trim();
    for (const base of STREAM_APIS) {
      try {
        const data = await fetchWithTimeout(`${base}/search/songs?query=${encodeURIComponent(q)}&limit=1`, 4500);
        const item = (data.data?.results || data.results || [])[0];
        if (item) {
          const cleaned = cleanSaavnTrack(item);
          if (cleaned.fullStream) {
            track.fullStream = cleaned.fullStream;
            if (cleaned.duration) track.duration = cleaned.duration;
            return track.fullStream;
          }
        }
      } catch (e) {}
    }
    return track.previewUrl || '';
  }

  async function loadDiscovery() {
    const grid = $('#discoverGrid');
    grid.innerHTML = '<div class="loading-state"><span class="loader"></span> Loading real-time charts…</div>';

    try {
      const tracks = await fetchRealHypeTracks();
      if (tracks.length) {
        renderTracks(grid, tracks, { empty: 'No songs found. Try search instead.' });
      } else {
        throw new Error('Empty');
      }
    } catch {
      grid.innerHTML = empty('Feed timed out. Tap Refresh or use Search.');
    }
  }

  async function runSearch(term) {
    term = String(term || '').trim();
    if (!term) { toast('Enter a song, artist, or lyrics first.'); return; }

    showView('search');
    $('#pageSearchInput').value = term;
    $('#globalSearchInput').value = term;
    $('#searchHeading').textContent = `Results for "${term}"`;
    $('#searchCount').textContent = 'Searching…';
    $('#searchGrid').innerHTML = '<div class="loading-state"><span class="loader"></span> Searching the catalogue…</div>';

    store.set('last_search_term', term);

    try {
      const tracks = await searchMusicTracks(term, 30);
      renderTracks('#searchGrid', tracks, { empty: 'No matches found. Try another line or spelling.' });
      $('#searchCount').textContent = `${tracks.length} tracks`;
    } catch {
      $('#searchGrid').innerHTML = empty('Search timed out. Check connection and tap Search again.');
      $('#searchCount').textContent = '';
    }
  }

  async function loadCharts() {
    const country = $('#countrySelect').value;
    const grid = $('#trendingGrid');
    grid.innerHTML = '<div class="loading-state"><span class="loader"></span> Loading charts…</div>';

    const queries = {
      in: 'Top 50 Bollywood Punjabi Hits',
      us: 'Billboard Hot 100 Hits',
      gb: 'Official UK Top 40 Singles',
      jp: 'Top J-Pop Hits',
      ca: 'Canada Top 40',
      au: 'Australia Top Hits',
      br: 'Brazil Top Hits',
      de: 'Germany Top 40'
    };

    try {
      const tracks = await searchMusicTracks(queries[country] || 'Global Top Hits', 30);
      renderTracks(grid, tracks, { empty: 'No chart data for this region.' });
      toast(`Loaded ${tracks.length} trending tracks`);
    } catch {
      grid.innerHTML = empty('The charts feed is unreachable right now. You can still use Search.');
    }
  }

  function showView(view, push = true) {
    const valid = ['home', 'trending', 'search', 'library', 'playlists', 'queue', 'equalizer'];
    if (!valid.includes(view)) view = 'home';

    activeView = view;
    store.set('last_view', view);

    $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));

    if (push && history[historyIndex] !== view) {
      history = history.slice(0, historyIndex + 1);
      history.push(view);
      historyIndex = history.length - 1;
    }

    $('#sidebar').classList.remove('open');
    const backdrop = $('#sidebarBackdrop');
    if (backdrop) backdrop.classList.remove('open');

    if (view === 'trending' && !$('#trendingGrid').children.length) loadCharts();
    if (view === 'library') renderLibrary();
    if (view === 'playlists') renderPlaylists();
    if (view === 'queue') renderQueue();

    const savedScroll = store.get(`scroll_${view}`, 0);
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
  }

  window.addEventListener('scroll', () => {
    store.set(`scroll_${activeView}`, window.scrollY);
  }, { passive: true });

  function renderLibrary() {
    renderTracks('#libraryGrid', saved, { empty: 'Your library is empty. Tap the heart on a track to save it.' });
    $('#libraryCount').textContent = `${saved.length} ${saved.length === 1 ? 'track' : 'tracks'}`;
  }

  function renderQueue() {
    renderTracks('#queueGrid', queue, { queueMode: true, empty: 'Your queue is empty. Add tracks with the plus button.' });
  }

  function renderPlaylists() {
    const host = $('#playlistList');
    if (!playlists.length) {
      host.innerHTML = empty('No playlists yet. Create one above, then add tracks with the playlist icon.');
      return;
    }
    host.innerHTML = playlists.map(p => `
      <article class="playlist-card" data-playlist="${esc(p.id)}">
        <div class="playlist-top">
          <div>
            <div class="playlist-name">${esc(p.name)}</div>
            <div class="playlist-sub">${p.tracks.length} ${p.tracks.length === 1 ? 'track' : 'tracks'}</div>
          </div>
          <button class="small-icon" data-action="delete-playlist" aria-label="Delete" title="Delete playlist"><svg viewBox="0 0 24 24">${ICONS.close}</svg></button>
        </div>
        <div class="playlist-tracks">
          ${p.tracks.slice(0, 5).map(t => `
            <div class="playlist-track">
              <img src="${esc(t.art || FALLBACK)}" alt="">
              <span>${esc(t.title)} —${esc(t.artist)}</span>
              <button class="small-icon" data-action="play-playlist-track" data-track-id="${esc(t.id)}" aria-label="Play"><svg viewBox="0 0 24 24">${ICONS.play}</svg></button>
            </div>
          `).join('')}
          ${p.tracks.length > 5 ? `<div class="muted small">And ${p.tracks.length - 5} more tracks</div>` : ''}
        </div>
        ${p.tracks.length ? `<button class="secondary-button" data-action="play-playlist" style="margin-top:14px"><svg viewBox="0 0 24 24">${ICONS.play}</svg> Play playlist</button>` : ''}
      </article>
    `).join('');
  }

  function saveTrack(track) {
    const idx = saved.findIndex(t => t.id === track.id);
    if (idx >= 0) {
      saved.splice(idx, 1);
      toast('Removed from your library');
    } else {
      saved.unshift(track);
      toast('Saved to your library');
    }
    store.set('library', saved);
    renderLibrary();
    if (current?.id === track.id) updateSaveButton();

    $$(`.track-card[data-track="${CSS.escape(track.id)}"]`).forEach(card => {
      const b = $('[data-action="save"]', card);
      if (b) {
        const yes = saved.some(t => t.id === track.id);
        b.classList.toggle('saved', yes);
        b.innerHTML = `<svg viewBox="0 0 24 24">${yes ? ICONS['heart-filled'] : ICONS.heart}</svg>`;
      }
    });
  }

  function updateSaveButton() {
    const b = $('#saveCurrent');
    const yes = current && saved.some(t => t.id === current.id);
    b.classList.toggle('saved', !!yes);
    b.innerHTML = `<svg viewBox="0 0 24 24">${yes ? ICONS['heart-filled'] : ICONS.heart}</svg>`;
  }

  function setPlayerIcon(playing, loading = false) {
    const spinner = $('#playSpinner');
    const iconSpan = $('#playIconSpan');

    if (loading) {
      spinner.style.display = 'block';
      iconSpan.style.display = 'none';
      return;
    }

    spinner.style.display = 'none';
    iconSpan.style.display = 'block';
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24">${playing ? ICONS.pause : ICONS.play}</svg>`;
    $('#playButton').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function updatePlayer(track) {
    current = track;
    store.set('current_track', track);

    document.body.classList.add('has-active-player');

    $('#playerTitle').textContent = track.title;
    $('#playerArtist').textContent = track.artist;
    $('#playerArt').src = track.art || FALLBACK;
    $('#playerArt').onerror = () => $('#playerArt').src = FALLBACK;

    updateSaveButton();
    setPlayerIcon(true);
  }

  function initEQ() {
    if (audioContext) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audioContext = new Ctx();
      sourceNode = audioContext.createMediaElementSource(audio);
      bassFilter = audioContext.createBiquadFilter(); bassFilter.type = 'lowshelf'; bassFilter.frequency.value = 150;
      midFilter = audioContext.createBiquadFilter(); midFilter.type = 'peaking'; midFilter.frequency.value = 1000; midFilter.Q.value = 0.8;
      trebleFilter = audioContext.createBiquadFilter(); trebleFilter.type = 'highshelf'; trebleFilter.frequency.value = 6000;
      sourceNode.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);
      trebleFilter.connect(audioContext.destination);
      updateEQ();
      return true;
    } catch {
      return false;
    }
  }

  function updateEQ() {
    const b = Number($('#bass').value);
    const m = Number($('#mid').value);
    const t = Number($('#treble').value);
    $('#bassValue').textContent = `${b} dB`;
    $('#midValue').textContent = `${m} dB`;
    $('#trebleValue').textContent = `${t} dB`;
    if (bassFilter) bassFilter.gain.value = b;
    if (midFilter) midFilter.gain.value = m;
    if (trebleFilter) trebleFilter.gain.value = t;
  }

  async function playTrack(track, fromQueue = false) {
    try {
      setPlayerIcon(false, true);

      if (!fromQueue) {
        const inQueueIdx = queue.findIndex(t => t.id === track.id);
        if (inQueueIdx === -1) {
          queue.unshift(track);
          queueIndex = 0;
        } else {
          queueIndex = inQueueIdx;
        }
        store.set('queue', queue);
      }

      updatePlayer(track);

      // Lazy load stream ONLY for this chosen song
      const streamUrl = await resolveStreamUrl(track);
      if (!streamUrl) throw new Error('No stream found');

      if (initEQ() && audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      if (audio.src !== streamUrl) {
        audio.src = streamUrl;
        audio.load();
      }

      await audio.play();
      setPlayerIcon(true, false);
    } catch {
      setPlayerIcon(false, false);
      toast('Tap Play to start audio stream.');
    }
  }

  function togglePlay() {
    if (!current) {
      const first = queue[0] || saved[0];
      if (first) playTrack(first);
      else toast('Choose a track to start listening.');
      return;
    }

    if (audio.paused) {
      if (initEQ() && audioContext.state === 'suspended') audioContext.resume();
      audio.play().then(() => setPlayerIcon(true)).catch(() => toast('Tap Play again to start audio.'));
    } else {
      audio.pause();
      setPlayerIcon(false);
    }
  }

  async function playNext(direction = 1) {
    if (queue.length > 1) {
      if (shuffle && direction > 0) {
        queueIndex = Math.floor(Math.random() * queue.length);
      } else {
        queueIndex = (queueIndex + direction + queue.length) % queue.length;
      }
      playTrack(queue[queueIndex], true);
      return;
    }

    // Auto-Next: Dynamically fetch real similar songs
    if (current) {
      toast('Auto-playing next popular track…');
      const term = `${current.artist} hits`;
      try {
        const results = await searchMusicTracks(term, 10);
        const nextTrackCandidate = results.find(t => t.id !== current.id);
        if (nextTrackCandidate) {
          queue.push(nextTrackCandidate);
          queueIndex = queue.length - 1;
          store.set('queue', queue);
          playTrack(nextTrackCandidate, true);
          return;
        }
      } catch (e) {}
    }

    if (saved.length) {
      playTrack(saved[0]);
    }
  }

  function addQueue(track) {
    if (!queue.some(t => t.id === track.id)) {
      queue.push(track);
      store.set('queue', queue);
      renderQueue();
      toast('Added to queue');
    } else {
      toast('Already in queue');
    }
  }

  function cardAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const card = button.closest('.track-card');
    if (card) {
      const id = card.dataset.track;
      const t = card._track || [...saved, ...queue, ...(current ? [current] : [])].find(x => x.id === id);
      if (!t) return;

      switch (button.dataset.action) {
        case 'play': playTrack(t); break;
        case 'save': saveTrack(t); break;
        case 'queue': addQueue(t); break;
        case 'add-playlist': {
          if (!playlists.length) { toast('Create a playlist first.'); showView('playlists'); return; }
          const choices = playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
          const answer = prompt(`Add "${t.title}" to which playlist?\n${choices}\nEnter a number:`);
          const n = Number(answer) - 1;
          if (answer !== null && Number.isInteger(n) && playlists[n]) {
            if (!playlists[n].tracks.some(x => x.id === t.id)) {
              playlists[n].tracks.push(t);
              store.set('playlists', playlists);
              toast(`Added to ${playlists[n].name}`);
            } else {
              toast('Track is already in that playlist.');
            }
          }
          break;
        }
        case 'remove':
          queue = queue.filter(x => x.id !== t.id);
          store.set('queue', queue);
          renderQueue();
          break;
      }
      return;
    }

    const playlistCard = button.closest('[data-playlist]');
    if (playlistCard) {
      const p = playlists.find(x => x.id === playlistCard.dataset.playlist);
      if (!p) return;
      if (button.dataset.action === 'delete-playlist') {
        playlists = playlists.filter(x => x.id !== p.id);
        store.set('playlists', playlists);
        renderPlaylists();
        toast('Playlist deleted');
      }
      if (button.dataset.action === 'play-playlist') {
        queue = [...p.tracks];
        queueIndex = 0;
        store.set('queue', queue);
        renderQueue();
        if (queue[0]) playTrack(queue[0], true);
      }
      if (button.dataset.action === 'play-playlist-track') {
        const t = p.tracks.find(x => x.id === button.dataset.trackId);
        if (t) playTrack(t);
      }
    }
  }

  $('#content').addEventListener('click', cardAction);
  $('#playlistList').addEventListener('click', cardAction);

  $('#globalSearch').addEventListener('submit', e => {
    e.preventDefault();
    runSearch($('#globalSearchInput').value);
  });

  $('#pageSearch').addEventListener('submit', e => {
    e.preventDefault();
    runSearch($('#pageSearchInput').value);
  });

  $$('.nav-item').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));$$
('[data-query]').forEach(b => b.addEventListener('click', () => runSearch(b.dataset.query)));
  $('#heroExplore').addEventListener('click', () => { showView('search'); $('#pageSearchInput').focus(); });
  $('#refreshDiscover').addEventListener('click', loadDiscovery);
  $('#loadCharts').addEventListener('click', loadCharts);
  $('#countrySelect').addEventListener('change', loadCharts);

  $('#playlistForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#playlistName').value.trim();
    if (!name) return;
    playlists.push({ id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, tracks: [] });
    store.set('playlists', playlists);
    $('#playlistName').value = '';
    renderPlaylists();
    toast('Playlist created');
  });

  $('#clearQueue').addEventListener('click', () => {
    queue = [];
    queueIndex = -1;
    store.set('queue', queue);
    renderQueue();
    toast('Queue cleared');
  });

  $('#playButton').addEventListener('click', togglePlay);
  $('#previousButton').addEventListener('click', () => {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else playNext(-1);
  });
  $('#nextButton').addEventListener('click', () => playNext(1));
  $('#shuffleButton').addEventListener('click', () => {
    shuffle = !shuffle;
    $('#shuffleButton').classList.toggle('active', shuffle);
    toast(shuffle ? 'Shuffle enabled' : 'Shuffle disabled');
  });
  $('#repeatButton').addEventListener('click', () => {
    repeat = !repeat;
    $('#repeatButton').classList.toggle('active', repeat);
    toast(repeat ? 'Repeat enabled' : 'Repeat disabled');
  });
  $('#saveCurrent').addEventListener('click', () => {
    if (current) saveTrack(current);
    else toast('Play a track first.');
  });
  $('#openQueue').addEventListener('click', () => showView('queue'));

  $('#volumeBar').addEventListener('input', e => audio.volume = Number(e.target.value));
  $('#seekBar').addEventListener('input', e => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(e.target.value);
  });

  audio.volume = 0.8;
  $('#volumeBar').value = 0.8;

  audio.addEventListener('timeupdate', () => {
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (current?.duration || 0);
    $('#seekBar').max = dur || 100;
    $('#seekBar').value = audio.currentTime || 0;
    $('#currentTime').textContent = fmt(audio.currentTime);
    $('#durationTime').textContent = fmt(dur);

    if (audio.buffered.length > 0 && dur > 0) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      const pct = Math.min(100, Math.max(0, (bufferedEnd / dur) * 100));
      $('#bufferFill').style.width = `${pct}%`;
    }
  });

  audio.addEventListener('progress', () => {
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (current?.duration || 0);
    if (audio.buffered.length > 0 && dur > 0) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      const pct = Math.min(100, Math.max(0, (bufferedEnd / dur) * 100));
      $('#bufferFill').style.width = `${pct}%`;
    }
  });

  audio.addEventListener('play', () => setPlayerIcon(true, false));
  audio.addEventListener('pause', () => setPlayerIcon(false, false));
  audio.addEventListener('ended', () => {
    if (repeat) {
      audio.currentTime = 0;
      audio.play();
    } else {
      playNext(1);
    }
  });

  audio.addEventListener('waiting', () => setPlayerIcon(false, true));
  audio.addEventListener('playing', () => setPlayerIcon(true, false));

  audio.addEventListener('error', () => {
    setPlayerIcon(false, false);
    toast('Song stream temporarily unreachable. Auto-playing next…');
    setTimeout(() => playNext(1), 1200);
  });

  $('#bass').addEventListener('input', updateEQ);
  $('#mid').addEventListener('input', updateEQ);
  $('#treble').addEventListener('input', updateEQ);
  $('#resetEQ').addEventListener('click', () => {
    $('#bass').value = $('#mid').value = $('#treble').value = 0;
    updateEQ();
    toast('Equalizer reset');
  });

  $('#aboutButton').addEventListener('click', () => $('#modalBackdrop').classList.add('open'));
  $('#modalClose').addEventListener('click', () => $('#modalBackdrop').classList.remove('open'));
  $('#modalOk').addEventListener('click', () => $('#modalBackdrop').classList.remove('open'));
  $('#modalBackdrop').addEventListener('click', e => {
    if (e.target.id === 'modalBackdrop') e.currentTarget.classList.remove('open');
  });

  const backdrop = document.createElement('div');
  backdrop.id = 'sidebarBackdrop';
  backdrop.className = 'sidebar-backdrop';
  document.body.append(backdrop);

  $('#mobileMenu').addEventListener('click', () => {
    const open = !$('#sidebar').classList.contains('open');
    $('#sidebar').classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
  });

  backdrop.addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    backdrop.classList.remove('open');
  });

  $('#backButton').addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      showView(history[historyIndex], false);
    }
  });
  $('#forwardButton').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      showView(history[historyIndex], false);
    }
  });

  showView(activeView, false);
  renderLibrary();
  renderPlaylists();
  renderQueue();
  loadDiscovery();
  updateEQ();
})();
