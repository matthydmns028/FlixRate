// ============================================================
// FlixRate – Search Results Controller
// ============================================================

const SearchPage = (() => {
  let currentQuery = "";
  let currentType = "all"; // all, movie, tv, anime
  let currentPage = 1;
  let isFetching = false;

  const UI = {
    grid: document.getElementById("search-results-grid"),
    queryTitle: document.getElementById("search-hero-query"),
    countLabel: document.getElementById("search-count-label"),
    input: document.getElementById("search-page-input"),
    form: document.getElementById("search-page-form"),
    loadMoreBtn: document.getElementById("search-more-btn"),
    loadMoreWrap: document.getElementById("search-load-more-wrap"),
    tabs: document.querySelectorAll(".search-tab"),
    suggWrap: document.getElementById("search-sugg-wrap"),
    suggChips: document.getElementById("search-sugg-chips"),
  };

  // ── INITIALIZATION ──────────────────────────────────────
  async function init() {
    if (window.Auth && typeof window.Auth.init === "function")
      window.Auth.init();

    // 1. Get query from URL
    const params = new URLSearchParams(window.location.search);
    currentQuery = params.get("q") || "";

    // 2. Set up event listeners
    setupEventListeners();

    // 3. Render suggestions or start search
    if (!currentQuery) {
      renderSuggestions();
      return;
    }

    UI.input.value = currentQuery;
    UI.suggWrap.style.display = "none";
    performSearch(true);
  }

  function setupEventListeners() {
    UI.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = UI.input.value.trim();
      if (q) {
        // Update URL without reloading (optional) or just reload
        window.location.href = `search.html?q=${encodeURIComponent(q)}`;
      }
    });

    UI.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (isFetching || tab.classList.contains("active")) return;
        UI.tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentType = tab.dataset.type;
        performSearch(true);
      });
    });

    UI.loadMoreBtn.addEventListener("click", () => {
      if (isFetching) return;
      currentPage++;
      performSearch(false);
    });
  }

  // ── CORE SEARCH LOGIC ───────────────────────────────────
  async function performSearch(isNewSearch = true) {
    if (isNewSearch) {
      currentPage = 1;
      UI.grid.innerHTML =
        '<div class="search-loading"><div class="search-spinner-lg"></div>Searching FlixRate...</div>';
      UI.loadMoreWrap.style.display = "none";
      UI.queryTitle.innerHTML = `Results for <span>"${esc(currentQuery)}"</span>`;
    }

    isFetching = true;
    UI.loadMoreBtn.disabled = true;

    try {
      let results = [];

      // Logic for combining API results
      if (currentType === "all") {
        const [tmdb, anime] = await Promise.all([
          API.searchTMDB(currentQuery),
          API.searchAnime(currentQuery),
        ]);
        results = [...mapTMDB(tmdb), ...mapAnime(anime)];
      } else if (currentType === "anime") {
        const anime = await API.searchAnime(currentQuery);
        results = mapAnime(anime);
      } else {
        const tmdb = await API.searchTMDB(currentQuery);
        results = mapTMDB(tmdb).filter((i) => i.type === currentType);
      }

      renderResults(results, isNewSearch);

      // Show/Hide Load More (simplification: only for TMDB-based results)
      UI.loadMoreWrap.style.display =
        results.length >= 10 && currentType !== "anime" ? "flex" : "none";
    } catch (err) {
      UI.grid.innerHTML = `<div class="search-empty-full">Failed to load results. Please try again.</div>`;
    } finally {
      isFetching = false;
      UI.loadMoreBtn.disabled = false;
    }
  }

  // ── MAPPING HELPERS ─────────────────────────────────────
  function mapTMDB(data) {
    return data.map((item) => ({
      id: item.id,
      title: item.title || item.name,
      img: item.poster_path ? CONFIG.TMDB_IMG_W500 + item.poster_path : null,
      score: item.vote_average ? item.vote_average.toFixed(1) : "—",
      type: item.media_type === "tv" ? "tv" : "movie",
      label: item.media_type === "tv" ? "TV" : "Movie",
      year: (item.release_date || item.first_air_date || "").slice(0, 4),
    }));
  }

  function mapAnime(data) {
    return data.map((item) => ({
      id: item.mal_id,
      title: item.title_english || item.title,
      img: item.images?.jpg?.image_url,
      score: item.score || "—",
      type: "anime",
      label: "Anime",
      year: item.year || "",
    }));
  }

  // ── RENDERERS ───────────────────────────────────────────
  function renderResults(items, isNewSearch) {
    if (isNewSearch) UI.grid.innerHTML = "";

    if (items.length === 0 && isNewSearch) {
      UI.grid.innerHTML = `
                <div class="search-empty-full">
                    <div class="search-empty-icon">🏖️</div>
                    <div class="search-empty-label">No results found</div>
                    <p>Try checking your spelling or use more general keywords.</p>
                </div>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "search-result-card";
      card.innerHTML = `
                <div class="src-poster-wrap">
                    <span class="src-type">${item.label}</span>
                    <span class="src-score">★ ${item.score}</span>
                    ${item.img ? `<img src="${item.img}" class="src-poster" alt="${esc(item.title)}" loading="lazy" referrerpolicy="no-referrer">` : `<div class="src-poster-ph">🎬</div>`}
                </div>
                <div class="src-body">
                    <div class="src-title">${esc(item.title)}</div>
                    <div class="src-meta">${item.year}</div>
                </div>
            `;
      card.onclick = () =>
        (window.location.href = `detail.html?type=${item.type}&id=${item.id}`);
      UI.grid.appendChild(card);
    });
  }

  function renderSuggestions() {
    const pops = [
      "Jujutsu Kaisen",
      "Interstellar",
      "The Dark Knight",
      "Solo Leveling",
      "Breaking Bad",
    ];
    UI.suggChips.innerHTML = pops
      .map((p) => `<button class="search-sugg-chip">${p}</button>`)
      .join("");

    UI.suggChips.querySelectorAll(".search-sugg-chip").forEach((chip) => {
      chip.onclick = () => {
        UI.input.value = chip.textContent;
        window.location.href = `search.html?q=${encodeURIComponent(chip.textContent)}`;
      };
    });
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", SearchPage.init);
