// ============================================================
// FlixRate – iTunes Music Integration
// ============================================================

const Music = (() => {

  // State
  let currentSearchAlbums = [];
  let billboardSongs = [];
  let trendingAlbums = [];
  let userStarSel = 0;
  let activeItem = null; // Can be album or track

  // Endpoint Configuration
  const ITUNES_API = "https://itunes.apple.com";
  const RSS_HOT100 = "https://itunes.apple.com/us/rss/topsongs/limit=24/json";
  const RSS_TOPALBUMS = "https://itunes.apple.com/us/rss/topalbums/limit=24/json";

  // Elements
  const searchBarSection = document.getElementById("music-search-bar");
  const input = document.getElementById("music-search-input");
  
  // Sections
  const secSearch = document.getElementById("music-search-section");
  const secTopRated = document.getElementById("music-toprated-section");
  const secBillboard = document.getElementById("music-billboard-section");
  const secTrending = document.getElementById("music-trending-section");

  // Grids/Rows
  const gridSearch = document.getElementById("music-search-grid");
  const rowTopRated = document.getElementById("music-toprated-row");
  const rowBillboard = document.getElementById("music-billboard-row");
  const rowTrending = document.getElementById("music-trending-row");
  const titleSearch = document.getElementById("music-search-title");
  
  // Modal Elements
  const modal = document.getElementById("music-modal");
  const closeBtn = document.getElementById("music-close-btn");
  const modalCover = document.getElementById("modal-cover");
  const modalTitle = document.getElementById("modal-title");
  const modalArtist = document.getElementById("modal-artist");
  const modalRight = document.getElementById("modal-right");
  const stars = document.querySelectorAll(".m-star");
  const saveBtn = document.getElementById("music-save-btn");
  const msgText = document.getElementById("music-vote-msg");

  function init() {
    bindEvents();
    loadDashboard();
  }

  function bindEvents() {
    if (searchBarSection) {
        searchBarSection.style.display = "flex";
        setTimeout(() => searchBarSection.style.opacity = "1", 50);
    }

    if (input) {
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && input.value.trim()) {
            searchMusic(input.value.trim());
          }
        });
        
        // Clear search restores dashboard
        input.addEventListener("input", (e) => {
          if (input.value.trim() === "") {
             showDashboard();
          }
        });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeModal();
        });
    }
    
    stars.forEach(star => {
      star.addEventListener("mouseenter", () => updateStars(star.dataset.val));
      star.addEventListener("mouseleave", () => updateStars(userStarSel));
      star.addEventListener("click", () => {
        userStarSel = parseInt(star.dataset.val, 10);
        updateStars(userStarSel);
      });
    });

    if (saveBtn) saveBtn.addEventListener("click", submitRating);
  }

  function showDashboard() {
    if(secSearch) secSearch.style.display = "none";
    if(secBillboard) secBillboard.style.display = "block";
    if(secTrending) secTrending.style.display = "block";
    loadTopRated(); // Reloads display status dynamically
  }

  function hideDashboard() {
    if(secSearch) secSearch.style.display = "block";
    if(secBillboard) secBillboard.style.display = "none";
    if(secTrending) secTrending.style.display = "none";
    if(secTopRated) secTopRated.style.display = "none";
  }

  // ── Dashboard Fetchers ──────────────────────────────────────────
  async function loadDashboard() {
    showDashboard();
    fetchBillboard();
    fetchTrending();
    // TopRated loads synchronously via localStorage immediately in showDashboard()
  }

  async function fetchBillboard() {
    if (!rowBillboard) return;
    rowBillboard.innerHTML = `<div class="music-loading"><div class="music-spinner"></div><div>Loading Billboard Hot 100...</div></div>`;
    try {
      const res = await fetch(RSS_HOT100);
      const data = await res.json();
      const entries = data.feed.entry || [];
      
      // Map RSS format to our internal schema
      billboardSongs = entries.map(e => ({
        id: e.id.attributes["im:id"],
        title: e["im:name"].label,
        artist: e["im:artist"].label,
        cover: e["im:image"][2].label.replace('170x170bb', '600x600bb'),
        type: 'track', // Explicitly marked as track for the modal
        genre: e.category.attributes.label,
        year: e["im:releaseDate"]?.label?.substring(0,4) || ""
      }));
      
      renderRow(billboardSongs, rowBillboard, true);
    } catch(e) {
      console.error(e);
      rowBillboard.innerHTML = `<div style="color:var(--music-accent)">Failed to load Hot 100.</div>`;
    }
  }

  async function fetchTrending() {
    if (!rowTrending) return;
    rowTrending.innerHTML = `<div class="music-loading"><div class="music-spinner"></div><div>Loading Trending Albums...</div></div>`;
    try {
      const res = await fetch(RSS_TOPALBUMS);
      const data = await res.json();
      const entries = data.feed.entry || [];
      
      trendingAlbums = entries.map(e => ({
        id: e.id.attributes["im:id"],
        title: e["im:name"].label,
        artist: e["im:artist"].label,
        cover: e["im:image"][2].label.replace('170x170bb', '600x600bb'),
        type: 'album',
        genre: e.category.attributes.label,
        year: e["im:releaseDate"]?.label?.substring(0,4) || ""
      }));
      
      renderRow(trendingAlbums, rowTrending);
    } catch(e) {
      console.error(e);
      rowTrending.innerHTML = `<div style="color:var(--music-accent)">Failed to load Trending Albums.</div>`;
    }
  }

  async function loadTopRated() {
    if (!secTopRated || !rowTopRated) return;
    const session = Auth.getSession();
    if (!session) {
      secTopRated.style.display = "none";
      return;
    }

    const userKey = `flixrate_ratings_${session.username}`;
    const userRatings = JSON.parse(localStorage.getItem(userKey) || '{}');
    
    // Extract music ratings
    const musicItems = Object.keys(userRatings)
      .filter(k => k.startsWith('music_'))
      .map(k => ({
         id: k.replace('music_', ''),
         val: userRatings[k].val,
         ts: userRatings[k].ts,
         title: userRatings[k].title || "Unknown",
         cover: userRatings[k].poster || "https://placehold.co/400x400/222/555?text=Music",
         type: 'unknown' // Could be track or album
      }))
      .sort((a,b) => b.val - a.val || b.ts - a.ts)
      .slice(0, 15); // Top 15

    if (musicItems.length === 0) {
      secTopRated.style.display = "none";
      return;
    }

    secTopRated.style.display = "block";
    
    rowTopRated.innerHTML = musicItems.map(item => `
        <div class="album-card" onclick="Music.openItem('${item.id}', '${item.type}')">
          <div class="album-art-wrap">
            <div class="music-card-rating">★ ${item.val.toFixed(1)}</div>
            <img src="${item.cover}" class="album-art" loading="lazy" alt="Cover">
          </div>
          <div class="album-info">
            <div class="album-title">${item.title}</div>
            <div class="album-meta">
              <span>Your Top Rated</span>
            </div>
          </div>
        </div>
    `).join("");
  }


  // ── Search Fetchers ──────────────────────────────────────────
  async function searchMusic(query) {
    if (!query) return showDashboard();
    hideDashboard();
    if (!titleSearch || !gridSearch) return;
    
    titleSearch.textContent = `Search results for "${query}"`;
    gridSearch.innerHTML = `<div class="music-loading" style="grid-column: 1/-1;"><div class="music-spinner"></div><div>Searching iTunes...</div></div>`;
    
    try {
      const res = await fetch(`${ITUNES_API}/search?term=${encodeURIComponent(query)}&entity=album,song&limit=48`);
      const data = await res.json();
      
      currentSearchAlbums = (data.results || []).map(r => ({
         id: r.collectionId || r.trackId,
         title: r.trackName || r.collectionName, // Prefers track name if it's a song
         artist: r.artistName,
         cover: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : '',
         type: r.wrapperType === 'track' ? 'track' : 'album',
         genre: r.primaryGenreName,
         year: r.releaseDate ? r.releaseDate.substring(0,4) : ""
      }));
      
      renderGrid(currentSearchAlbums, gridSearch);
    } catch (e) {
      console.error(e);
      gridSearch.innerHTML = `<div style="grid-column:1/-1; color:var(--music-accent)">Failed to fetch search results.</div>`;
    }
  }

  // ── Generic Renderers ─────────────────────────────────────────────
  
  function renderRow(items, container, isNumbered = false) {
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted)">No data available.</div>`;
      return;
    }

    container.innerHTML = items.map((item, index) => {
      const r = API.getLocalRating('music', item.id);
      const ratingHtml = r.rating ? `<div class="music-card-rating">★ ${r.rating.toFixed(1)}</div>` : '';
      const numBadge = isNumbered ? `<div style="position:absolute; top:-10px; left:-10px; background:var(--music-accent); color:#000; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; z-index:10; box-shadow:0 4px 10px rgba(0,0,0,0.5)">${index + 1}</div>` : '';

      return `
        <div class="album-card" onclick="Music.openItem('${item.id}', '${item.type}')">
          <div class="album-art-wrap">
            ${numBadge}
            ${ratingHtml}
            <img src="${item.cover}" class="album-art" loading="lazy" alt="Cover">
          </div>
          <div class="album-info">
            <div class="album-title">${item.title}</div>
            <div class="album-artist">${item.artist}</div>
            <div class="album-meta">
              <span>${item.year}</span>
              <span style="opacity:0.5">${item.genre}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderGrid(items, container) {
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1; color:var(--text-muted)">No items found.</div>`;
      return;
    }
    
    // The grid rendering is identical to row rendering on the individual card level
    const tempDiv = document.createElement('div');
    renderRow(items, tempDiv);
    container.innerHTML = tempDiv.innerHTML;
  }

  // ── Modal Handling ──────────────────────────────────────────────
  async function openItem(id, type) {
    // Attempt to locate item data from any of our current local caches
    let item = billboardSongs.find(a => a.id.toString() === id.toString()) || 
               trendingAlbums.find(a => a.id.toString() === id.toString()) ||
               currentSearchAlbums.find(a => a.id.toString() === id.toString());
               
    // If opening from TopRated where we only have partial local data, fetch lookup immediately
    if (!item || type === 'unknown') {
        try {
            const res = await fetch(`${ITUNES_API}/lookup?id=${id}`);
            const data = await res.json();
            if(data.results && data.results.length > 0) {
               const r = data.results[0];
               item = {
                 id: r.collectionId || r.trackId,
                 title: r.trackName || r.collectionName,
                 artist: r.artistName,
                 cover: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : '',
                 type: r.wrapperType === 'track' ? 'track' : 'album'
               };
            }
        } catch(e) { console.error(e); }
    }
    
    if (!item) return;
    activeItem = item;

    modalCover.src = item.cover;
    modalTitle.textContent = item.title;
    modalArtist.textContent = item.artist;

    // Local Storage Rating UI check
    userStarSel = 0;
    msgText.style.opacity = "0";
    const session = Auth.getSession();
    if (session) {
      const userRatings = JSON.parse(localStorage.getItem(`flixrate_ratings_${session.username}`) || "{}");
      const key = `music_${id}`;
      if (userRatings[key] && userRatings[key].val) {
        userStarSel = userRatings[key].val;
        saveBtn.textContent = "Update Rating";
      } else {
        saveBtn.textContent = "Save Rating";
      }
    }
    updateStars(userStarSel);

    modal.classList.add("active");
    
    // If it's a song (like a Hot 100 track), we don't need a tracklist. Provide an Apple Music link instead.
    if (item.type === 'track') {
       modalRight.innerHTML = `
         <div class="tracklist-title">Track Details</div>
         <div style="margin-top: 20px; color:var(--text-muted)">
           This is an individual track.<br><br>
           You can rate this specific song, or <a href="https://music.apple.com/us/album/${item.id}" target="_blank" style="color:var(--music-accent); text-decoration:none;">Listen on Apple Music ↗</a>
         </div>
       `;
       return;
    }

    // Otherwise, it's an album, fetch the tracklist
    modalRight.innerHTML = `<div class="music-loading"><div class="music-spinner"></div><div>Loading Tracks...</div></div>`;

    try {
      const res = await fetch(`${ITUNES_API}/lookup?id=${id}&entity=song`);
      const data = await res.json();
      
      const tracks = data.results.filter(r => r.wrapperType === 'track');
      
      let html = `<div class="tracklist-title">Tracklist</div>`;
      if (tracks.length === 0) {
        html += `<div style="color:var(--text-muted)">No track details available.</div>`;
      } else {
        html += tracks.map(s => `
          <div class="track-item">
            <div class="track-num">${s.trackNumber || '-'}</div>
            <div class="track-name">${s.trackName}</div>
            ${s.trackViewUrl ? `<a href="${s.trackViewUrl}" target="_blank" class="track-link">Play ↗</a>` : ''}
          </div>
        `).join("");
      }
      modalRight.innerHTML = html;

    } catch(e) {
      console.error(e);
      modalRight.innerHTML = `<div style="color:var(--music-accent)">Failed to load tracks.</div>`;
    }
  }
  function closeModal() {
    modal.classList.remove("active");
  }

  function updateStars(val) {
    stars.forEach((star, i) => {
      star.classList.toggle("selected", i + 1 <= val);
      star.classList.toggle("hovered", i + 1 <= val && !userStarSel);
    });
  }

  function submitRating() {
    if (!userStarSel || !activeItem) return;
    const session = Auth.getSession();
    if (!session) {
      alert("Please sign in to vote!");
      window.location.href = "login.html";
      return;
    }

    const key = `music_${activeItem.id}`;
    const userKey = `flixrate_ratings_${session.username}`;
    const userRatings = JSON.parse(localStorage.getItem(userKey) || '{}');
    const prevVoteObj = userRatings[key];
    const prevVote = prevVoteObj ? prevVoteObj.val : 0;

    const ALL_RATINGS_KEY = "flixrate_ratings";
    const ratings = JSON.parse(localStorage.getItem(ALL_RATINGS_KEY) || "{}");
    if (!ratings[key]) ratings[key] = { total: 0, count: 0, dist: {} };

    if (prevVote) {
      ratings[key].total -= prevVote;
      ratings[key].count -= 1;
      if (ratings[key].dist[prevVote]) ratings[key].dist[prevVote]--;
    }

    ratings[key].total += userStarSel;
    ratings[key].count += 1;
    if (!ratings[key].dist[userStarSel]) ratings[key].dist[userStarSel] = 0;
    ratings[key].dist[userStarSel]++;

    localStorage.setItem(ALL_RATINGS_KEY, JSON.stringify(ratings));

    // Save for this user profile highlight usage
    userRatings[key] = { 
      val: userStarSel, 
      ts: Date.now(),
      title: activeItem.title,
      poster: activeItem.cover
    };
    localStorage.setItem(userKey, JSON.stringify(userRatings));

    msgText.textContent = `You rated this ${userStarSel}/5 ★`;
    msgText.style.opacity = "1";
    saveBtn.textContent = "Update Rating";
    
    // Refresh Top Rated immediately
    loadTopRated();
  }

  // Export
  return { init, openAlbum };

})();

document.addEventListener("DOMContentLoaded", Music.init);
