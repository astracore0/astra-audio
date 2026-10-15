/* Astra Audio — static GitHub Pages edition. Uses official Apple preview URLs. */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const ICONS = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chart:'<path d="M4 19V9m6 10V5m6 14v-7m6 7H2"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    heart:'<path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z"/>',
    playlist:'<path d="M4 6h12M4 11h12M4 16h7"/><path d="M18 13v8m-4-4h8"/>',
    queue:'<path d="M4 5h12M4 10h12M4 15h7"/><path d="M17 15v6m-3-3h6"/>',
    sliders:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    back:'<path d="m15 18-6-6 6-6"/>', forward:'<path d="m9 18 6-6-6-6"/>',
    enter:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
    'play-small':'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor" stroke="none"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    previous:'<path d="M6 5v14M19 5l-10 7 10 7z" fill="currentColor" stroke="none"/>',
    next:'<path d="M18 5v14M5 5l10 7-10 7z" fill="currentColor" stroke="none"/>',
    shuffle:'<path d="m16 3 5 4-5 4M3 7h3c4 0 5 10 9 10h6M16 13l5 4-5 4M3 17h3c1.4 0 2.4-1.5 3.3-3"/>',
    repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
    volume:'<path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
    'heart-filled':'<path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z" fill="currentColor"/>'
  };
  $$('[data-icon]').forEach(el => { const name=el.dataset.icon; if(ICONS[name]) el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; });
  const FALLBACK='assets/cover.svg';
  const store = {
    get(key, fallback){ try { const v=JSON.parse(localStorage.getItem('astra_'+key)); return v ?? fallback; } catch { return fallback; } },
    set(key, value){ try { localStorage.setItem('astra_'+key, JSON.stringify(value)); } catch { toast('Browser storage is full.'); } }
  };
  let saved=store.get('library',[]), playlists=store.get('playlists',[]), queue=[], current=null, queueIndex=-1, shuffle=false, repeat=false, history=['home'], historyIndex=0, toastTimer;
  const audio=$('#audio');
  let audioContext=null, bassFilter=null, midFilter=null, trebleFilter=null, sourceNode=null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cleanTrack = t => ({id:String(t.trackId ?? t.id ?? ''), title:t.trackName || t.title || 'Untitled track', artist:t.artistName || t.artist || 'Unknown artist', album:t.collectionName || t.album || '', art:t.artworkUrl100 || t.art || FALLBACK, preview:t.previewUrl || t.preview || '', url:t.trackViewUrl || '', kind:t.kind || 'song'});
  const dedupe = arr => [...new Map(arr.filter(t=>t && t.id).map(t=>[String(t.id),t])).values()];
  function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }
  function empty(text){return `<div class="empty-state">${esc(text)}</div>`;}
  function trackCard(t, {queueMode=false}={}) {
    const isSaved=saved.some(s=>s.id===t.id);
    const hasPreview=!!t.preview;
    return `<article class="track-card" data-track="${esc(t.id)}">
      <div class="cover-wrap"><img src="${esc(t.art||FALLBACK)}" alt="" loading="lazy" onerror="this.src='${FALLBACK}'"><button class="cover-play" data-action="play" aria-label="Play ${esc(t.title)}"><svg viewBox="0 0 24 24">${ICONS.play}</svg></button></div>
      <div class="track-meta"><div class="track-title" title="${esc(t.title)}">${esc(t.title)}</div><div class="track-sub">${esc(t.artist)}</div><div class="track-album">${esc(t.album || (hasPreview?'Preview available':'No preview available'))}</div></div>
      <div class="track-actions">
        <button class="small-icon ${isSaved?'saved':''}" data-action="save" aria-label="${isSaved?'Remove from':'Save to'} library" title="${isSaved?'Remove from library':'Save to library'}"><svg viewBox="0 0 24 24">${isSaved?ICONS['heart-filled']:ICONS.heart}</svg></button>
        ${queueMode?'<button class="small-icon" data-action="remove" aria-label="Remove from queue" title="Remove from queue"><svg viewBox="0 0 24 24">'+ICONS.close+'</svg></button>':`<button class="small-icon" data-action="queue" aria-label="Add to queue" title="Add to queue"><svg viewBox="0 0 24 24">${ICONS.plus}</svg></button><button class="small-icon" data-action="add-playlist" aria-label="Add to playlist" title="Add to playlist"><svg viewBox="0 0 24 24">${ICONS.playlist}</svg></button>`}
        <button class="play-small-button" data-action="play" aria-label="${hasPreview?'Play':'Preview unavailable'}" ${hasPreview?'':'disabled'}><svg viewBox="0 0 24 24">${ICONS.play}</svg></button>
      </div>
    </article>`;
  }
  function renderTracks(target, tracks, opts={}) {
    const el=typeof target==='string'?$(target):target;
    if(!el) return;
    el.innerHTML=tracks.length?tracks.map(t=>trackCard(t,opts)).join(''):empty(opts.empty || 'Nothing here yet.');
  }
  async function getJson(url){
    const r=await fetch(url); if(!r.ok) throw new Error(`Music service returned ${r.status}`); return r.json();
  }
  async function searchTracks(term, limit=24){
    const url=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
    const data=await getJson(url);
    return dedupe((data.results||[]).map(cleanTrack).filter(t=>t.id));
  }
  async function loadDiscovery(){
    const grid=$('#discoverGrid'); grid.innerHTML='<div class="loading-state"><span class="loader"></span> Finding music previews…</div>';
    const terms=['indie pop','alternative music','electronic pop','soundtrack music','japanese pop','acoustic pop','international pop'];
    const term=terms[Math.floor(Math.random()*terms.length)];
    try { const tracks=await searchTracks(term,18); renderTracks(grid,tracks,{empty:'No tracks found. Try Search instead.'}); }
    catch { grid.innerHTML=empty('Could not connect to the music catalogue. Check your connection and try Refresh.'); }
  }
  async function runSearch(term){
    term=String(term||'').trim(); if(!term){toast('Enter a song, artist, or album first.');return;}
    showView('search'); $('#pageSearchInput').value=term; $('#globalSearchInput').value=term;
    $('#searchHeading').textContent=`Results for “${term}”`; $('#searchCount').textContent='Searching…';
    $('#searchGrid').innerHTML='<div class="loading-state"><span class="loader"></span> Searching the catalogue…</div>';
    try { const tracks=await searchTracks(term,40); renderTracks('#searchGrid',tracks,{empty:'No matches. Try a different spelling or search term.'}); $('#searchCount').textContent=`${tracks.length} tracks`; }
    catch { $('#searchGrid').innerHTML=empty('Search failed. Check your internet connection and try again.'); $('#searchCount').textContent=''; }
  }
  async function loadCharts(){
    const country=$('#countrySelect').value, grid=$('#trendingGrid');
    grid.innerHTML='<div class="loading-state"><span class="loader"></span> Loading current chart…</div>';
    try {
      const data=await getJson(`https://rss.applemarketingtools.com/api/v2/${encodeURIComponent(country)}/music/most-played/50/songs.json`);
      const tracks=dedupe((data.feed?.results||[]).map(cleanTrack));
      renderTracks(grid,tracks,{empty:'No chart data for this region right now.'});
      toast(`Loaded ${tracks.length} chart tracks`);
    } catch {
      grid.innerHTML=empty('The chart feed is unavailable right now. You can still search the music catalogue.');
    }
  }
  function showView(view, push=true){
    const valid=['home','trending','search','library','playlists','queue','equalizer']; if(!valid.includes(view))view='home';
    $$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));
    $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
    if(push && history[historyIndex]!==view){history=history.slice(0,historyIndex+1);history.push(view);historyIndex=history.length-1;}
    $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('open');
    if(view==='trending' && !$('#trendingGrid').children.length) loadCharts();
    if(view==='library') renderLibrary();
    if(view==='playlists') renderPlaylists();
    if(view==='queue') renderQueue();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderLibrary(){ renderTracks('#libraryGrid',saved,{empty:'Your library is empty. Tap the heart on a track to save it.'}); $('#libraryCount').textContent=`${saved.length} ${saved.length===1?'track':'tracks'}`; }
  function renderQueue(){ renderTracks('#queueGrid',queue,{queueMode:true,empty:'Your queue is empty. Add tracks with the plus button.'}); }
  function renderPlaylists(){
    const host=$('#playlistList');
    if(!playlists.length){host.innerHTML=empty('No playlists yet. Create one above, then add tracks using the playlist action.');return;}
    host.innerHTML=playlists.map(p=>`<article class="playlist-card" data-playlist="${esc(p.id)}"><div class="playlist-top"><div><div class="playlist-name">${esc(p.name)}</div><div class="playlist-sub">${p.tracks.length} ${p.tracks.length===1?'track':'tracks'}</div></div><button class="small-icon" data-action="delete-playlist" aria-label="Delete playlist" title="Delete playlist"><svg viewBox="0 0 24 24">${ICONS.close}</svg></button></div><div class="playlist-tracks">${p.tracks.slice(0,5).map(t=>`<div class="playlist-track"><img src="${esc(t.art||FALLBACK)}" alt=""><span>${esc(t.title)} — ${esc(t.artist)}</span><button class="small-icon" data-action="play-playlist-track" data-track-id="${esc(t.id)}" aria-label="Play ${esc(t.title)}"><svg viewBox="0 0 24 24">${ICONS.play}</svg></button></div>`).join('')}${p.tracks.length>5?`<div class="muted small">And ${p.tracks.length-5} more tracks</div>`:''}</div>${p.tracks.length?`<button class="secondary-button" data-action="play-playlist" style="margin-top:14px"><svg viewBox="0 0 24 24">${ICONS.play}</svg> Play playlist</button>`:''}</article>`).join('');
  }
  function saveTrack(track){
    const idx=saved.findIndex(t=>t.id===track.id);
    if(idx>=0){saved.splice(idx,1);toast('Removed from your library');}
    else{saved.unshift(track);toast('Saved to your library');}
    store.set('library',saved); renderLibrary();
    if(current?.id===track.id) updateSaveButton();
    // Update saved hearts across currently rendered cards.
    $$(`.track-card[data-track="${CSS.escape(track.id)}"]`).forEach(card=>{const b=$('[data-action="save"]',card);if(b){const yes=saved.some(t=>t.id===track.id);b.classList.toggle('saved',yes);b.innerHTML=`<svg viewBox="0 0 24 24">${yes?ICONS['heart-filled']:ICONS.heart}</svg>`;}});
  }
  function updateSaveButton(){const b=$('#saveCurrent');const yes=current&&saved.some(t=>t.id===current.id);b.classList.toggle('saved',!!yes);b.innerHTML=`<svg viewBox="0 0 24 24">${yes?ICONS['heart-filled']:ICONS.heart}</svg>`;}
  function setPlayerIcon(playing){$('#playButton').innerHTML=`<svg viewBox="0 0 24 24">${playing?ICONS.pause:ICONS.play}</svg>`;$('#playButton').setAttribute('aria-label',playing?'Pause':'Play');}
  function updatePlayer(track){
    current=track; $('#playerTitle').textContent=track.title; $('#playerArtist').textContent=track.artist; $('#playerArt').src=track.art||FALLBACK; $('#playerArt').onerror=()=>$('#playerArt').src=FALLBACK; updateSaveButton(); setPlayerIcon(true);
  }
  function initEQ(){
    if(audioContext) return true;
    try {
      const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return false;
      audioContext=new Ctx(); sourceNode=audioContext.createMediaElementSource(audio);
      bassFilter=audioContext.createBiquadFilter(); bassFilter.type='lowshelf'; bassFilter.frequency.value=150;
      midFilter=audioContext.createBiquadFilter(); midFilter.type='peaking'; midFilter.frequency.value=1000; midFilter.Q.value=0.8;
      trebleFilter=audioContext.createBiquadFilter(); trebleFilter.type='highshelf'; trebleFilter.frequency.value=6000;
      sourceNode.connect(bassFilter);bassFilter.connect(midFilter);midFilter.connect(trebleFilter);trebleFilter.connect(audioContext.destination);
      updateEQ(); return true;
    } catch { return false; }
  }
  function updateEQ(){
    const b=Number($('#bass').value),m=Number($('#mid').value),t=Number($('#treble').value);
    $('#bassValue').textContent=`${b} dB`;$('#midValue').textContent=`${m} dB`;$('#trebleValue').textContent=`${t} dB`;
    if(bassFilter)bassFilter.gain.value=b;if(midFilter)midFilter.gain.value=m;if(trebleFilter)trebleFilter.gain.value=t;
  }
  async function playTrack(track, fromQueue=false){
    if(!track?.preview){toast('This track has no playable preview.');return;}
    try{
      if(!fromQueue){
        if(!queue.some(t=>t.id===track.id)) queue.unshift(track);
        queueIndex=queue.findIndex(t=>t.id===track.id);
      }
      updatePlayer(track);
      if(initEQ()&&audioContext.state==='suspended') await audioContext.resume();
      if(audio.src!==track.preview) audio.src=track.preview;
      await audio.play();
    }catch{setPlayerIcon(false);toast('Playback was blocked or the preview is unavailable. Tap Play to retry.');}
  }
  function togglePlay(){
    if(!current){const first=queue.find(t=>t.preview)||saved.find(t=>t.preview);if(first)playTrack(first);else toast('Choose a track to start listening.');return;}
    if(audio.paused){if(initEQ()&&audioContext.state==='suspended')audioContext.resume();audio.play().then(()=>setPlayerIcon(true)).catch(()=>toast('Tap Play again to allow audio playback.'));}
    else{audio.pause();setPlayerIcon(false);}
  }
  function playNext(direction=1){
    if(!queue.length){toast('Your queue is empty.');return;}
    if(shuffle && direction>0){let idx=queue.length>1?Math.floor(Math.random()*queue.length):0;queueIndex=idx;}
    else queueIndex=(queueIndex+direction+queue.length)%queue.length;
    playTrack(queue[queueIndex],true);
  }
  function addQueue(track){if(!queue.some(t=>t.id===track.id))queue.push(track);renderQueue();toast(queue.some(t=>t.id===track.id)?'Added to queue':'Already in queue');}
  function trackFromCard(el){const id=el.closest('[data-track]')?.dataset.track;return [...saved,...queue,...$$('.track-card').map(c=>{try{return JSON.parse(c.dataset.trackData||'null')}catch{return null}})].find(t=>t?.id===id)||getTrackById(id);}
  function getTrackById(id){
    const candidates=[...saved,...queue,...(current?[current]:[])];
    for(const t of candidates)if(t.id===id)return t;
    const card=$(`.track-card[data-track="${CSS.escape(id)}"]`);
    if(card){
      // Each card has its canonical track cached in memory, attached below at render time.
      return card._track||null;
    }
    return null;
  }
  function attachTrackData(){
    $$('.track-card').forEach(card=>{
      const id=card.dataset.track;
      if(card._track) return;
      const t=[...saved,...queue,...(current?[current]:[])].find(x=>x.id===id);
      if(t)card._track=t;
    });
  }
  // Render with stable track objects available to delegated click handlers.
  const originalRenderTracks=renderTracks;
  renderTracks=function(target,tracks,opts={}){originalRenderTracks(target,tracks,opts);const el=typeof target==='string'?$(target):target;$$('.track-card',el).forEach((c,i)=>c._track=tracks[i]);};
  function cardAction(event){
    const button=event.target.closest('[data-action]');if(!button)return;
    const card=button.closest('.track-card');if(card){
      const t=card._track||getTrackById(card.dataset.track);if(!t)return;
      switch(button.dataset.action){case'play':playTrack(t);break;case'save':saveTrack(t);break;case'queue':addQueue(t);break;case'add-playlist':{
        if(!playlists.length){toast('Create a playlist first.');showView('playlists');return;}
        const choices=playlists.map((p,i)=>`${i+1}. ${p.name}`).join('\\n');
        const answer=prompt(`Add "${t.title}" to which playlist?\\n${choices}\\nEnter a number:`);
        const n=Number(answer)-1;
        if(answer!==null && Number.isInteger(n) && playlists[n]){
          if(!playlists[n].tracks.some(x=>x.id===t.id)){playlists[n].tracks.push(t);store.set('playlists',playlists);toast(`Added to ${playlists[n].name}`);}else toast('Track is already in that playlist.');
        }
        break;
      }case'remove':queue=queue.filter(x=>x.id!==t.id);renderQueue();break;}
      return;
    }
    const playlistCard=button.closest('[data-playlist]');if(playlistCard){
      const p=playlists.find(x=>x.id===playlistCard.dataset.playlist);if(!p)return;
      if(button.dataset.action==='delete-playlist'){playlists=playlists.filter(x=>x.id!==p.id);store.set('playlists',playlists);renderPlaylists();toast('Playlist deleted');}
      if(button.dataset.action==='play-playlist'){queue=[...p.tracks];queueIndex=0;renderQueue();playTrack(queue[0],true);}
      if(button.dataset.action==='play-playlist-track'){const t=p.tracks.find(x=>x.id===button.dataset.trackId);if(t)playTrack(t);}
    }
  }
  $('#content').addEventListener('click',cardAction);
  $('#playlistList').addEventListener('click',cardAction);
  $('#globalSearch').addEventListener('submit',e=>{e.preventDefault();runSearch($('#globalSearchInput').value);});
  $('#pageSearch').addEventListener('submit',e=>{e.preventDefault();runSearch($('#pageSearchInput').value);});
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $$('[data-query]').forEach(b=>b.addEventListener('click',()=>runSearch(b.dataset.query)));
  $('#heroExplore').addEventListener('click',()=>{showView('search');$('#pageSearchInput').focus();});
  $('#refreshDiscover').addEventListener('click',loadDiscovery);
  $('#loadCharts').addEventListener('click',loadCharts);
  $('#countrySelect').addEventListener('change',loadCharts);
  $('#playlistForm').addEventListener('submit',e=>{
    e.preventDefault();const name=$('#playlistName').value.trim();if(!name)return;
    playlists.push({id:`p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,tracks:[]});store.set('playlists',playlists);$('#playlistName').value='';renderPlaylists();toast('Playlist created');
  });
  $('#clearQueue').addEventListener('click',()=>{queue=[];queueIndex=-1;renderQueue();toast('Queue cleared');});
  $('#playButton').addEventListener('click',togglePlay);
  $('#previousButton').addEventListener('click',()=>{if(audio.currentTime>3){audio.currentTime=0;}else playNext(-1);});
  $('#nextButton').addEventListener('click',()=>playNext(1));
  $('#shuffleButton').addEventListener('click',()=>{shuffle=!shuffle;$('#shuffleButton').classList.toggle('active',shuffle);toast(shuffle?'Shuffle enabled':'Shuffle disabled');});
  $('#repeatButton').addEventListener('click',()=>{repeat=!repeat;$('#repeatButton').classList.toggle('active',repeat);toast(repeat?'Repeat enabled':'Repeat disabled');});
  $('#saveCurrent').addEventListener('click',()=>{if(current)saveTrack(current);else toast('Play a track first.');});
  $('#openQueue').addEventListener('click',()=>showView('queue'));
  $('#volumeBar').addEventListener('input',e=>audio.volume=Number(e.target.value));
  $('#seekBar').addEventListener('input',e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value);});
  audio.volume=.8;
  audio.addEventListener('timeupdate',()=>{$('#seekBar').max=Number.isFinite(audio.duration)?audio.duration:30;$('#seekBar').value=audio.currentTime||0;$('#currentTime').textContent=fmt(audio.currentTime);$('#durationTime').textContent=fmt(audio.duration);});
  audio.addEventListener('play',()=>setPlayerIcon(true));audio.addEventListener('pause',()=>setPlayerIcon(false));
  audio.addEventListener('ended',()=>{if(repeat){audio.currentTime=0;audio.play();}else if(queue.length)playNext(1);else setPlayerIcon(false);});
  audio.addEventListener('error',()=>{setPlayerIcon(false);toast('This preview could not be played. Try another track.');});
  function fmt(n){if(!Number.isFinite(n)||n<0)return'0:00';const m=Math.floor(n/60),s=Math.floor(n%60);return`${m}:${String(s).padStart(2,'0')}`;}
  $('#bass').addEventListener('input',updateEQ);$('#mid').addEventListener('input',updateEQ);$('#treble').addEventListener('input',updateEQ);
  $('#resetEQ').addEventListener('click',()=>{$('#bass').value=$('#mid').value=$('#treble').value=0;updateEQ();toast('Equalizer reset');});
  $('#aboutButton').addEventListener('click',()=>$('#modalBackdrop').classList.add('open'));
  $('#modalClose').addEventListener('click',()=>$('#modalBackdrop').classList.remove('open'));$('#modalOk').addEventListener('click',()=>$('#modalBackdrop').classList.remove('open'));
  $('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')e.currentTarget.classList.remove('open');});
  $('#mobileMenu').addEventListener('click',()=>{const open=!$('#sidebar').classList.contains('open');$('#sidebar').classList.toggle('open',open);$('#sidebarBackdrop').classList.toggle('open',open);});
  // The backdrop is inserted here so the sidebar works on small screens without a framework.
  const backdrop=document.createElement('div');backdrop.id='sidebarBackdrop';backdrop.className='sidebar-backdrop';document.body.append(backdrop);backdrop.addEventListener('click',()=>{$('#sidebar').classList.remove('open');backdrop.classList.remove('open');});
  $('#backButton').addEventListener('click',()=>{if(historyIndex>0){historyIndex--;showView(history[historyIndex],false);}});
  $('#forwardButton').addEventListener('click',()=>{if(historyIndex<history.length-1){historyIndex++;showView(history[historyIndex],false);}});
  // Playlist add on long press is not required on desktop; use the accessible context menu or prompt.
  renderLibrary();renderPlaylists();renderQueue();loadDiscovery();updateEQ();
})();