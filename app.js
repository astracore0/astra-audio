let library = JSON.parse(localStorage.getItem('astra_library') || '[]');
let queue = [];
let currentIndex = -1;

const audio = document.getElementById('audioEl');
const statusLine = document.getElementById('statusLine');
const playSvg = document.getElementById('playSvg');
const dockSpinner = document.getElementById('dockSpinner');

const MIRRORS = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacy.com.de',
    'https://piped-api.lunar.icu'
];

window.addEventListener('beforeunload', (e) => {
    if (audio && !audio.paused && audio.currentTime > 0) {
        e.preventDefault();
        e.returnValue = 'Music is currently playing. Leaving will stop playback.';
        return e.returnValue;
    }
});

let audioCtx, bassNode, midNode, trebleNode;
function initAudioEngine() {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        const src = audioCtx.createMediaElementSource(audio);
        bassNode = audioCtx.createBiquadFilter();
        bassNode.type = 'lowshelf';
        bassNode.frequency.value = 60;
        midNode = audioCtx.createBiquadFilter();
        midNode.type = 'peaking';
        midNode.frequency.value = 1000;
        trebleNode = audioCtx.createBiquadFilter();
        trebleNode.type = 'highshelf';
        trebleNode.frequency.value = 12000;
        src.connect(bassNode);
        bassNode.connect(midNode);
        midNode.connect(trebleNode);
        trebleNode.connect(audioCtx.destination);
    } catch (e) {}
}

function updateEQ() {
    initAudioEngine();
    const b = parseInt(document.getElementById('bassSlider').value || 0);
    const m = parseInt(document.getElementById('midSlider').value || 0);
    const t = parseInt(document.getElementById('trebleSlider').value || 0);
    document.getElementById('bassVal').innerText = `${b} dB`;
    document.getElementById('midVal').innerText = `${m} dB`;
    document.getElementById('trebleVal').innerText = `${t} dB`;
    if (bassNode) bassNode.gain.value = b;
    if (midNode) midNode.gain.value = m;
    if (trebleNode) trebleNode.gain.value = t;
    const warn = document.getElementById('bassWarning');
    if (warn) warn.style.display = (b >= 18) ? 'block' : 'none';
}

function toggleDrawer(open) {
    const backdrop = document.getElementById('drawerBackdrop');
    const drawer = document.getElementById('navDrawer');
    if (backdrop) backdrop.classList.toggle('open', open);
    if (drawer) drawer.classList.toggle('open', open);
}

function navTo(view, btn) {
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`view-${view}`);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    toggleDrawer(false);
    if (view === 'trending') loadTrendingRegion();
    if (view === 'library') refreshLibrary();
    if (view === 'queue') renderQueue();
}

function setStatus(msg) {
    if (statusLine) statusLine.innerText = msg;
}

function createTrackCard(item, container, isLocal = false) {
    const div = document.createElement('div');
    div.className = 'track-item';
    const thumb = item.low_thumb || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='48' height='48' fill='%23222'/></svg>";
    div.innerHTML = `
        <img class="track-thumb" src="${thumb}" loading="lazy" alt="Thumb">
        <div class="track-info">
            <div class="t-title">${item.title}</div>
            <div class="t-sub">${item.uploader || 'Artist'}</div>
        </div>
        <button class="listen-btn">
            <span class="btn-text">${isLocal ? 'Play' : 'Listen'}</span>
            <div class="btn-spinner" style="display:none;"></div>
        </button>
    `;
    const btn = div.querySelector('.listen-btn');
    btn.onclick = (e) => {
        e.stopPropagation();
        if (isLocal) playLocalTrack(item);
        else playStreamUrl(item, btn);
    };
    container.appendChild(div);
}

async function fetchFromMirrors(endpoint) {
    for (let mirror of MIRRORS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${mirror}${endpoint}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return await res.json();
        } catch (e) {}
    }
    throw new Error('All node connections timed out');
}

async function playStreamUrl(item, btnEl) {
    const txt = btnEl ? btnEl.querySelector('.btn-text') : null;
    const spin = btnEl ? btnEl.querySelector('.btn-spinner') : null;
    if (btnEl) { btnEl.disabled = true; if (txt) txt.style.display = 'none'; if (spin) spin.style.display = 'block'; }
    if (dockSpinner) dockSpinner.style.display = 'block';
    if (playSvg) playSvg.style.display = 'none';
    setStatus(`Extracting full audio stream...`);

    try {
        const data = await fetchFromMirrors(`/streams/${item.id}`);
        const streams = (data.audioStreams || []).sort((a, b) => b.bitrate - a.bitrate);
        const selected = streams.find(s => !s.format?.includes('WEBM')) || streams[0];

        if (selected && selected.url) {
            item.stream_url = selected.url;
            if (!library.some(x => x.id === item.id)) {
                library.unshift(item);
                localStorage.setItem('astra_library', JSON.stringify(library));
            }
            refreshLibrary();
            playLocalTrack(item);
            setStatus(`Playing: ${item.title}`);
        } else {
            setStatus("Audio format unavailable.");
        }
    } catch (err) {
        setStatus("Network delay. Please tap Listen again.");
    } finally {
        if (btnEl) { btnEl.disabled = false; if (txt) txt.style.display = 'inline'; if (spin) spin.style.display = 'none'; }
        if (dockSpinner) dockSpinner.style.display = 'none';
        if (playSvg) playSvg.style.display = 'block';
    }
}

function playLocalTrack(track) {
    initAudioEngine();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    const hiRes = track.high_thumb || track.low_thumb || "";
    document.getElementById('dockArt').src = hiRes;
    document.getElementById('dockTitle').innerText = track.title;
    document.getElementById('dockArtist').innerText = track.uploader || 'Astra Client';

    const idx = library.findIndex(x => x.id === track.id);
    currentIndex = idx !== -1 ? idx : 0;
    queue = library.slice();

    audio.src = track.stream_url;
    audio.load();
    audio.play().then(() => setPlayIcon(true)).catch(() => setStatus("Tap Play button to resume."));
}

function setPlayIcon(playing) {
    if (playSvg) {
        playSvg.innerHTML = playing ? '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path fill="currentColor" d="M8 5v14l11-7z"/>';
    }
}

function togglePlay() {
    if (!audio.src) return;
    initAudioEngine();
    if (audio.paused) { audio.play(); setPlayIcon(true); }
    else { audio.pause(); setPlayIcon(false); }
}

function nextSong() {
    if (library.length === 0) return;
    currentIndex = (currentIndex + 1) % library.length;
    playLocalTrack(library[currentIndex]);
}

function prevSong() {
    if (library.length === 0) return;
    currentIndex = (currentIndex - 1 + library.length) % library.length;
    playLocalTrack(library[currentIndex]);
}

audio.onended = () => { nextSong(); };

async function loadDiscovery() {
    setStatus(`Fetching discovery charts...`);
    try {
        const data = await fetchFromMirrors('/search?q=Top%20Global%20English%20Hits&filter=music_songs');
        const grid = document.getElementById('discoverGrid');
        if (!grid) return;
        grid.innerHTML = '';
        (data.items || []).slice(0, 10).forEach(item => {
            const vidId = item.url ? item.url.replace('/watch?v=', '') : item.id;
            if (vidId) {
                createTrackCard({
                    id: vidId,
                    title: item.title,
                    uploader: item.uploaderName || 'Artist',
                    low_thumb: item.thumbnail,
                    high_thumb: item.thumbnail
                }, grid, false);
            }
        });
        setStatus(`Ready`);
    } catch {
        setStatus("Tap Shuffle to retry mirror.");
    }
}

async function loadTrendingRegion() {
    const region = document.getElementById('regionSelect')?.value || 'English Hits';
    setStatus(`Loading charts for ${region}...`);
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;
    grid.innerHTML = '';
    try {
        const data = await fetchFromMirrors(`/search?q=${encodeURIComponent(region)}&filter=music_songs`);
        (data.items || []).slice(0, 10).forEach(item => {
            const vidId = item.url ? item.url.replace('/watch?v=', '') : item.id;
            if (vidId) {
                createTrackCard({
                    id: vidId,
                    title: item.title,
                    uploader: item.uploaderName || 'Artist',
                    low_thumb: item.thumbnail,
                    high_thumb: item.thumbnail
                }, grid, false);
            }
        });
        setStatus(`Updated`);
    } catch {
        setStatus("Regional chart unreachable.");
    }
}

async function runSearch() {
    const input = document.getElementById('searchInput');
    const q = input ? input.value.trim() : '';
    if (!q) return;
    setStatus(`Searching...`);
    const searchArea = document.getElementById('searchBoxArea');
    const grid = document.getElementById('searchGrid');
    if (searchArea) searchArea.style.display = 'block';
    if (grid) grid.innerHTML = '';

    try {
        const data = await fetchFromMirrors(`/search?q=${encodeURIComponent(q)}&filter=music_songs`);
        (data.items || []).slice(0, 10).forEach(item => {
            const vidId = item.url ? item.url.replace('/watch?v=', '') : item.id;
            if (vidId) {
                createTrackCard({
                    id: vidId,
                    title: item.title,
                    uploader: item.uploaderName || 'Artist',
                    low_thumb: item.thumbnail,
                    high_thumb: item.thumbnail
                }, grid, false);
            }
        });
        setStatus(`Found ${(data.items || []).length} items`);
    } catch {
        setStatus("Search failed on mirror node.");
    }
}

function refreshLibrary() {
    const counter = document.getElementById('libCounter');
    if (counter) counter.innerText = `${library.length} tracks cached`;
    const grid = document.getElementById('libraryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    library.forEach(item => createTrackCard(item, grid, true));
}

function renderQueue() {
    const grid = document.getElementById('queueGrid');
    if (!grid) return;
    grid.innerHTML = '';
    library.forEach(item => createTrackCard(item, grid, true));
}

function togglePin() { setStatus("Track saved to client browser storage."); }
function savePrefs() { setStatus("Preferences updated."); }

const seekBar = document.getElementById('seekBar');
if (seekBar) seekBar.oninput = () => { audio.currentTime = seekBar.value; };
const volBar = document.getElementById('volBar');
if (volBar) volBar.oninput = (e) => { audio.volume = e.target.value; };

audio.ontimeupdate = () => {
    if (seekBar) {
        seekBar.max = Math.floor(audio.duration) || 0;
        seekBar.value = Math.floor(audio.currentTime) || 0;
    }
    const cur = document.getElementById('timeCur');
    const tot = document.getElementById('timeTot');
    if (cur) cur.innerText = fmt(audio.currentTime);
    if (tot) tot.innerText = fmt(audio.duration);
};

function fmt(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

window.onload = () => {
    refreshLibrary();
    loadDiscovery();
};
