// ============================================================
// FlixRate – App Module (main controller)
// ============================================================

const App = (() => {
  // ── Render a horizontal row of cards ──────────────────────
  function createCard(item) {
    const card = document.createElement("div");
    card.className = "media-card";
    card.style.cursor = "pointer";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", item.title);
    // Context-menu data attributes
    let localRatingStr = "";
    if (item.id && item.itemType) {
      const r = API.getLocalRating(item.itemType, item.id);
      if (r.rating > 0) localRatingStr = r.rating.toFixed(1);

      card.dataset.ctxId = item.id;
      card.dataset.ctxType = item.itemType;
      card.dataset.ctxTitle = item.title || "";
      card.dataset.ctxPoster = item.img || "";
      card.dataset.ctxYear = item.sub || "";
      card.dataset.ctxRating = localRatingStr;
    }
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.img}" alt="${item.title}" class="card-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='img/placeholder.svg'">
        <div class="card-overlay">
          <div class="card-rating">${localRatingStr ? "★ " + localRatingStr : ""}</div>
          <div class="card-type-badge">${item.type}</div>
        </div>
        <div class="card-play-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${item.title}</h3>
        <p class="card-sub">${item.sub || ""}</p>
      </div>`;

    // Navigate to detail page on click
    if (item.id && item.itemType) {
      const url = `detail.html?type=${item.itemType}&id=${item.id}`;
      card.addEventListener("click", () => (window.location.href = url));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter") window.location.href = url;
      });

      // ── Trailer hover-preview: card → expanded 16:9 popup ──
      let hoverTimer = null;
      let previewPopup = null;

      card.addEventListener("mouseenter", () => {
        hoverTimer = setTimeout(async () => {
          if (previewPopup) return;
          try {
            let trailerKey = null;
            if (item.itemType === "movie")
              trailerKey = await API.fetchMovieTrailer(item.id);
            else if (item.itemType === "tv")
              trailerKey = await API.fetchTVTrailer(item.id);
            if (!trailerKey || !card.matches(":hover")) return;

            // Measure card's current position on screen
            const rect = card.getBoundingClientRect();

            // Target expanded size (16:9, min 340px wide)
            const expandW = Math.max(340, rect.width * 2.4);
            const expandH = (expandW * 9) / 16;

            // Center the expanded popup on the card, clamped to viewport
            let left = rect.left + rect.width / 2 - expandW / 2;
            let top = rect.top + rect.height / 2 - expandH / 2;
            left = Math.max(8, Math.min(left, window.innerWidth - expandW - 8));
            top = Math.max(8, Math.min(top, window.innerHeight - expandH - 8));

            // Build popup: initial rect same as card, then transition to expanded
            const popup = document.createElement("div");
            popup.className = "card-trailer-popup";
            // Start exactly at card position
            popup.style.cssText = `
              left:${rect.left}px; top:${rect.top}px;
              width:${rect.width}px; height:${rect.height}px;
            `;
            popup.innerHTML = `
              <iframe
                src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${trailerKey}"
                allow="autoplay; encrypted-media" allowfullscreen></iframe>
              <div class="ctp-bar">
                <span class="ctp-title">${item.title}</span>
                <span class="ctp-hint">🔊 Click card to open</span>
              </div>`;

            document.body.appendChild(popup);
            previewPopup = popup;

            // Next frame: expand to target size/position
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                popup.style.left = `${left}px`;
                popup.style.top = `${top}px`;
                popup.style.width = `${expandW}px`;
                popup.style.height = `${expandH}px`;
                popup.classList.add("open");
              }),
            );
          } catch (e) {
            /* silent */
          }
        }, 750);
      });

      card.addEventListener("mouseleave", () => {
        clearTimeout(hoverTimer);
        if (previewPopup) {
          const p = previewPopup;
          previewPopup = null;
          // Shrink back before removing
          const rect = card.getBoundingClientRect();
          p.style.left = `${rect.left}px`;
          p.style.top = `${rect.top}px`;
          p.style.width = `${rect.width}px`;
          p.style.height = `${rect.height}px`;
          p.classList.remove("open");
          setTimeout(() => p.remove(), 320);
        }
      });
    }
    return card;
  }

  async function loadMovieRows() {
    // ── Trending Movies ────────────────────────────────────
    const movieRow = document.getElementById("row-trending-movies");
    if (movieRow) {
      try {
        const movies = await API.fetchTrendingMovies();
        const row = movieRow.querySelector(".row-track");
        // rowTrack.innerHTML = '';
        movies.slice(0, 12).forEach((m) => {
          if (!m.poster_path) return;
          row.appendChild(
            createCard({
              img: CONFIG.TMDB_IMG_W300 + m.poster_path,
              title: m.title || m.name,
              rating: m.vote_average,
              type: "🎬 Movie",
              sub: (m.release_date || "").slice(0, 4),
              id: m.id,
              itemType: "movie",
            }),
          );
        });
      } catch (e) {
        console.warn("Trending movies row error:", e.message);
      }
    }

    // ── Trending TV ────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 300));
    const tvRow = document.getElementById("row-trending-tv");
    if (tvRow) {
      try {
        const shows = await API.fetchTrendingTV();
        const row = tvRow.querySelector(".row-track");
        shows.slice(0, 12).forEach((s) => {
          if (!s.poster_path) return;
          row.appendChild(
            createCard({
              img: CONFIG.TMDB_IMG_W300 + s.poster_path,
              title: s.name || s.title,
              rating: s.vote_average,
              type: "📺 Series",
              sub: (s.first_air_date || "").slice(0, 4),
              id: s.id,
              itemType: "tv",
            }),
          );
        });
      } catch (e) {
        console.warn("Trending TV row error:", e.message);
      }
    }
  }

  async function loadAnimeRows() {
    // ── Top Anime ──────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 600));
    const animeRow = document.getElementById("row-top-anime");
    if (animeRow) {
      try {
        const anime = await API.fetchTopAnime();
        const row = animeRow.querySelector(".row-track");
        row.innerHTML = "";
        anime.slice(0, 12).forEach((a) => {
          const img =
            a.images?.jpg?.large_image_url || a.images?.jpg?.image_url;
          if (!img) return;
          row.appendChild(
            createCard({
              img,
              title: a.title_english || a.title,
              rating: a.score,
              type: "🌸 Anime",
              sub: a.year || "",
              id: a.mal_id,
              itemType: "anime",
            }),
          );
        });
      } catch (e) {
        console.warn("Top anime row error:", e.message);
      }
    }

    // ── Seasonal Anime ─────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    const seasonRow = document.getElementById("row-seasonal-anime");
    if (seasonRow) {
      try {
        const seasonal = await API.fetchSeasonalAnime();
        const row = seasonRow.querySelector(".row-track");
        seasonal.slice(0, 12).forEach((a) => {
          const img =
            a.images?.jpg?.large_image_url || a.images?.jpg?.image_url;
          if (!img) return;
          row.appendChild(
            createCard({
              img,
              title: a.title_english || a.title,
              rating: a.score,
              type: "🌸 Anime",
              sub: a.season ? `${a.season} ${a.year}` : "",
              id: a.mal_id,
              itemType: "anime",
            }),
          );
        });
      } catch (e) {
        console.warn("Seasonal anime row error:", e.message);
      }
    }
  }

  // ── Search ────────────────────────────────────────────────
  function initSearch() {
    const form = document.getElementById("search-form");
    const input = document.getElementById("search-input");
    const resultsEl = document.getElementById("search-results");

    if (!form || !input) return;

    let debounceTimer = null;

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (q.length < 2) {
        if (resultsEl) resultsEl.classList.remove("search-results--open");
        return;
      }
      debounceTimer = setTimeout(() => performSearch(q), 450);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length >= 2) {
        resultsEl?.classList.add("search-results--open");
      }
    });

    document.addEventListener("click", (e) => {
      if (!form.contains(e.target)) {
        resultsEl?.classList.remove("search-results--open");
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    });
  }

  async function performSearch(query) {
    const resultsEl = document.getElementById("search-results");
    if (!resultsEl) return;
    resultsEl.innerHTML = '<p class="search-loading">Searching…</p>';
    resultsEl.classList.add("search-results--open");

    const [tmdbResults, animeResults] = await Promise.allSettled([
      API.searchTMDB(query),
      API.searchAnime(query),
    ]);

    const items = [];
    if (tmdbResults.status === "fulfilled") {
      tmdbResults.value.slice(0, 4).forEach((r) => {
        if (!r.poster_path) return;
        items.push({
          img: CONFIG.TMDB_IMG_W300 + r.poster_path,
          title: r.title || r.name,
          type: r.media_type === "tv" ? "📺 Series" : "🎬 Movie",
          id: r.id,
          itemType: r.media_type === "tv" ? "tv" : "movie",
        });
      });
    }
    if (animeResults.status === "fulfilled") {
      animeResults.value.slice(0, 4).forEach((a) => {
        const img = a.images?.jpg?.image_url;
        if (!img) return;
        items.push({
          img,
          title: a.title_english || a.title,
          type: "🌸 Anime",
          id: a.mal_id,
          itemType: "anime",
        });
      });
    }

    if (items.length === 0) {
      resultsEl.innerHTML = '<p class="search-empty">No results found.</p>';
      return;
    }

    const seeAll = `<div class="search-result-item" onclick="window.location.href='search.html?q=${encodeURIComponent(query)}'" style="cursor:pointer;border-top:1px solid rgba(255,255,255,0.06);justify-content:center;color:var(--accent-light);font-weight:700;font-size:0.82rem;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        See all results for "${query}"
      </div>`;
    resultsEl.innerHTML =
      items
        .map(
          (i) => `
      <div class="search-result-item" onclick="window.location.href='detail.html?type=${i.itemType}&id=${i.id}'" style="cursor:pointer">
        <img src="${i.img}" alt="${i.title}" class="search-result-img" referrerpolicy="no-referrer">
        <div class="search-result-info">
          <span class="search-result-title">${i.title}</span>
          <span class="search-result-type">${i.type}</span>
        </div>
      </div>`,
        )
        .join("") + seeAll;
  }

  // ── Scroll row arrows ─────────────────────────────────────
  function initRowScroll() {
    document.querySelectorAll(".content-row").forEach((row) => {
      const track = row.querySelector(".row-track");
      const prevBtn = row.querySelector(".row-prev");
      const nextBtn = row.querySelector(".row-next");
      if (!track) return;

      prevBtn?.addEventListener("click", () => {
        track.scrollBy({ left: -580, behavior: "smooth" });
      });
      nextBtn?.addEventListener("click", () => {
        track.scrollBy({ left: 580, behavior: "smooth" });
      });
    });
  }

  // ── Mobile nav ────────────────────────────────────────────
  function initMobileNav() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("nav-menu");
    toggle?.addEventListener("click", () => {
      menu?.classList.toggle("nav-menu--open");
      toggle.classList.toggle("nav-toggle--open");
    });
  }

  async function init() {
    Auth.init();
    initSearch();
    initMobileNav();
    initRowScroll();

    // Hero loads first – movie rows then anime (to respect Jikan rate limits)
    await Hero.init();
    await loadMovieRows();
    await loadAnimeRows();
  }

  return { init, initSearch, performSearch };
})();

// Bootstrap
document.addEventListener("DOMContentLoaded", App.init);

window.App = App;
