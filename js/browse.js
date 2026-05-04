// ============================================================
// FlixRate – Browse / Genre Category Page
// ============================================================

const Browse = (() => {
  // ── Genre definitions ─────────────────────────────────────
  const GENRES = {
    movie: [
      { id: 28, name: "Action", icon: "💥", color: ["#b91c1c", "#dc2626"] },
      { id: 12, name: "Adventure", icon: "🗺️", color: ["#b45309", "#d97706"] },
      { id: 16, name: "Animation", icon: "🎨", color: ["#7c3aed", "#a855f7"] },
      { id: 35, name: "Comedy", icon: "😄", color: ["#d97706", "#fbbf24"] },
      { id: 80, name: "Crime", icon: "🔫", color: ["#374151", "#6b7280"] },
      {
        id: 99,
        name: "Documentary",
        icon: "🎥",
        color: ["#065f46", "#059669"],
      },
      { id: 18, name: "Drama", icon: "🎭", color: ["#1d4ed8", "#3b82f6"] },
      { id: 14, name: "Fantasy", icon: "🔮", color: ["#5b21b6", "#8b5cf6"] },
      { id: 27, name: "Horror", icon: "👻", color: ["#1f2937", "#4b5563"] },
      { id: 10402, name: "Music", icon: "🎵", color: ["#be185d", "#ec4899"] },
      { id: 9648, name: "Mystery", icon: "🕵️", color: ["#312e81", "#6366f1"] },
      { id: 10749, name: "Romance", icon: "❤️", color: ["#9f1239", "#e11d48"] },
      { id: 878, name: "Sci-Fi", icon: "🚀", color: ["#0e7490", "#06b6d4"] },
      { id: 53, name: "Thriller", icon: "😱", color: ["#1e3a5f", "#2563eb"] },
      { id: 10752, name: "War", icon: "⚔️", color: ["#78350f", "#92400e"] },
      { id: 37, name: "Western", icon: "🤠", color: ["#92400e", "#b45309"] },
    ],
    tv: [
      {
        id: 10759,
        name: "Action & Adventure",
        icon: "💥",
        color: ["#b91c1c", "#dc2626"],
      },
      { id: 16, name: "Animation", icon: "🎨", color: ["#7c3aed", "#a855f7"] },
      { id: 35, name: "Comedy", icon: "😄", color: ["#d97706", "#fbbf24"] },
      { id: 80, name: "Crime", icon: "🔫", color: ["#374151", "#6b7280"] },
      {
        id: 99,
        name: "Documentary",
        icon: "🎥",
        color: ["#065f46", "#059669"],
      },
      { id: 18, name: "Drama", icon: "🎭", color: ["#1d4ed8", "#3b82f6"] },
      {
        id: 10765,
        name: "Fantasy & Sci-Fi",
        icon: "🔮",
        color: ["#5b21b6", "#8b5cf6"],
      },
      { id: 10768, name: "History", icon: "📜", color: ["#78350f", "#92400e"] },
      { id: 9648, name: "Mystery", icon: "🕵️", color: ["#312e81", "#6366f1"] },
      { id: 10749, name: "Romance", icon: "❤️", color: ["#9f1239", "#e11d48"] },
      { id: 10763, name: "News", icon: "📰", color: ["#0e7490", "#06b6d4"] },
      { id: 10764, name: "Reality", icon: "📺", color: ["#be185d", "#ec4899"] },
      { id: 10766, name: "Soap", icon: "💬", color: ["#6d28d9", "#7c3aed"] },
      { id: 10767, name: "Talk", icon: "🎙️", color: ["#065f46", "#10b981"] },
      {
        id: 10770,
        name: "TV Movie",
        icon: "🎬",
        color: ["#1f2937", "#374151"],
      },
      { id: 37, name: "Western", icon: "🤠", color: ["#92400e", "#b45309"] },
    ],
    anime: [
      { id: 1, name: "Action", icon: "💥", color: ["#b91c1c", "#dc2626"] },
      { id: 2, name: "Adventure", icon: "🗺️", color: ["#b45309", "#d97706"] },
      { id: 4, name: "Comedy", icon: "😄", color: ["#d97706", "#fbbf24"] },
      { id: 8, name: "Drama", icon: "🎭", color: ["#1d4ed8", "#3b82f6"] },
      { id: 10, name: "Fantasy", icon: "🔮", color: ["#5b21b6", "#8b5cf6"] },
      { id: 14, name: "Horror", icon: "👻", color: ["#1f2937", "#4b5563"] },
      { id: 7, name: "Mystery", icon: "🕵️", color: ["#312e81", "#6366f1"] },
      { id: 22, name: "Romance", icon: "❤️", color: ["#9f1239", "#e11d48"] },
      { id: 24, name: "Sci-Fi", icon: "🚀", color: ["#0e7490", "#06b6d4"] },
      {
        id: 36,
        name: "Slice of Life",
        icon: "🌸",
        color: ["#be185d", "#ec4899"],
      },
      { id: 30, name: "Sports", icon: "⚽", color: ["#065f46", "#059669"] },
      {
        id: 37,
        name: "Supernatural",
        icon: "👁️",
        color: ["#4c1d95", "#7c3aed"],
      },
      { id: 41, name: "Thriller", icon: "😱", color: ["#1e3a5f", "#2563eb"] },
      { id: 17, name: "Mecha", icon: "🤖", color: ["#374151", "#6b7280"] },
      { id: 50, name: "Isekai", icon: "🌀", color: ["#166534", "#16a34a"] },
      { id: 38, name: "Military", icon: "⚔️", color: ["#78350f", "#92400e"] },
    ],
  };

  // ── State ─────────────────────────────────────────────────
  let currentType = "movie"; // 'movie' | 'tv' | 'anime'
  let currentGenre = null; // genre object
  let currentSort = "popular"; // 'popular' | 'rating' | 'newest'
  let currentPage = 1;
  let totalPages = 1;
  let isFetching = false;

  // ── Helpers ───────────────────────────────────────────────
  function esc(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function imgUrl(path) {
    return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
  }

  // ── Render type tabs ──────────────────────────────────────
  function renderTabs() {
    document.querySelectorAll(".browse-type-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === currentType);
    });
  }

  // ── Render genre grid ─────────────────────────────────────
  function renderGenres() {
    const grid = document.getElementById("genre-grid");
    if (!grid) return;
    const genres = GENRES[currentType] || [];
    grid.innerHTML = genres
      .map(
        (g, i) => `
      <div class="genre-card ${currentGenre?.id === g.id ? "active" : ""}"
           onclick="Browse.selectGenre(${g.id})"
           style="animation-delay:${i * 0.03}s">
        <div class="genre-card-bg" style="background:linear-gradient(135deg,${g.color[0]},${g.color[1]})"></div>
        <div class="genre-card-icon">${g.icon}</div>
        <div class="genre-card-name">${esc(g.name)}</div>
      </div>`,
      )
      .join("");
  }

  // ── Select a genre ────────────────────────────────────────
  function selectGenre(id) {
    const genres = GENRES[currentType] || [];
    currentGenre = genres.find((g) => g.id === id) || null;
    currentPage = 1;
    totalPages = 1;
    renderGenres();
    fetchResults(false);
  }

  // ── Fetch results ─────────────────────────────────────────
  async function fetchResults(append = false) {
    if (isFetching) return;
    isFetching = true;

    const grid = document.getElementById("browse-results-grid");
    const loadMoreWrap = document.getElementById("browse-load-more-wrap");
    const loadMoreBtn = document.getElementById("btn-load-more");

    if (!append) {
      grid.innerHTML = `<div class="browse-loading"><div class="browse-spinner"></div>Loading…</div>`;
      if (loadMoreWrap) loadMoreWrap.style.display = "none";
    } else {
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = "Loading…";
      }
    }

    // Update results bar label
    const label = document.getElementById("results-bar-label");
    if (label) {
      label.textContent = currentGenre
        ? `${currentGenre.icon} ${currentGenre.name}`
        : currentType === "movie"
          ? "🎬 All Movies"
          : currentType === "tv"
            ? "📺 All TV Shows"
            : "🎌 All Anime";
    }

    try {
      let cards = [];

      if (currentType === "anime") {
        cards = await fetchAnime(currentGenre?.id, currentSort, currentPage);
      } else {
        cards = await fetchTMDB(
          currentType,
          currentGenre?.id,
          currentSort,
          currentPage,
        );
      }

      isFetching = false;

      if (!append) {
        grid.innerHTML = "";
      }

      if (!cards.length) {
        if (!append) {
          grid.innerHTML = `<div class="browse-empty"><div class="browse-empty-icon">🎭</div><div class="browse-empty-text">No results found.</div></div>`;
        }
        if (loadMoreWrap) loadMoreWrap.style.display = "none";
        return;
      }

      // Count badge
      const countEl = document.getElementById("results-count");
      if (countEl && !append)
        countEl.textContent = `Page ${currentPage} / ${totalPages}`;

      cards.forEach((card) => {
        const el = document.createElement("div");
        el.className = "browse-card";
        el.innerHTML = buildCardHTML(card);
        el.onclick = () => goToDetail(card.type, card.id);
        // Context-menu data attributes
        el.dataset.ctxId = card.id;
        el.dataset.ctxType = card.type;
        el.dataset.ctxTitle = card.title || "";
        el.dataset.ctxPoster = card.poster || "";
        el.dataset.ctxYear = card.year || "";
        el.dataset.ctxRating = card.score || "";
        grid.appendChild(el);
      });

      // Load more
      if (loadMoreWrap) {
        loadMoreWrap.style.display = currentPage < totalPages ? "flex" : "none";
      }
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = "Load More";
      }
    } catch (e) {
      console.error("Browse fetch error:", e);
      isFetching = false;
      if (!append)
        grid.innerHTML = `<div class="browse-empty"><div class="browse-empty-icon">⚠️</div><div class="browse-empty-text">Failed to load results. Check your connection.</div></div>`;
    }
  }

  // ── TMDB fetch ────────────────────────────────────────────
  async function fetchTMDB(type, genreId, sort, page) {
    const sortMap = {
      popular: "popularity.desc",
      rating: "vote_average.desc",
      newest: "primary_release_date.desc",
    };
    const sortTVMap = {
      popular: "popularity.desc",
      rating: "vote_average.desc",
      newest: "first_air_date.desc",
    };
    const sortParam =
      (type === "tv" ? sortTVMap : sortMap)[sort] || "popularity.desc";

    const params = new URLSearchParams({
      sort_by: sortParam,
      page,
      "vote_count.gte": sort === "rating" ? 200 : 50,
    });
    if (genreId) params.set("with_genres", genreId);

    const endpoint = `https://api.themoviedb.org/3/discover/${type}?${params}`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${CONFIG.TMDB_BEARER}`,
        accept: "application/json",
      },
    });
    const data = await res.json();
    totalPages = Math.min(data.total_pages || 1, 20); // cap at 20 pages

    return (data.results || []).map((m) => {
      const lr = API.getLocalRating(type, m.id);
      return {
        id: m.id,
        type,
        title: m.title || m.name,
        poster: imgUrl(m.poster_path),
        score: lr.rating ? lr.rating.toFixed(1) : undefined,
        year: (m.release_date || m.first_air_date || "").slice(0, 4),
      };
    });
  }

  // ── Jikan/Anime fetch ─────────────────────────────────────
  async function fetchAnime(genreId, sort, page) {
    const sortMap = { popular: "bypopularity", rating: "byscore", newest: "" };
    const orderBy = sortMap[sort] || "bypopularity";

    let url = `https://api.jikan.moe/v4/anime?page=${page}&limit=20`;
    if (genreId) url += `&genres=${genreId}`;
    if (orderBy) url += `&order_by=members&sort=desc`;
    if (sort === "rating")
      url = url.replace("order_by=members", "order_by=score");
    if (sort === "newest")
      url = url.replace(
        "order_by=members&sort=desc",
        "order_by=start_date&sort=desc",
      );

    const res = await fetch(url);
    const data = await res.json();
    const pagination = data.pagination || {};
    totalPages = Math.min(pagination.last_visible_page || 1, 20);

    return (data.data || []).map((a) => {
      const lr = API.getLocalRating("anime", a.mal_id);
      return {
        id: a.mal_id,
        type: "anime",
        title: a.title_english || a.title,
        poster: a.images?.jpg?.image_url || null,
        score: lr.rating ? lr.rating.toFixed(1) : undefined,
        year: a.year || "",
      };
    });
  }

  // ── Card HTML ─────────────────────────────────────────────
  function buildCardHTML(card) {
    const typeLabel =
      card.type === "anime"
        ? "🎌 Anime"
        : card.type === "tv"
          ? "📺 TV"
          : "🎬 Movie";
    const fallbackIcon =
      card.type === "anime" ? "🎌" : card.type === "tv" ? "📺" : "🎬";
    return `
      <div class="browse-card-poster-wrap">
        ${
          card.poster
            ? `<img src="${esc(card.poster)}" alt="${esc(card.title)}" class="browse-card-poster" loading="lazy" referrerpolicy="no-referrer">`
            : `<div class="browse-card-poster-placeholder" style="background:linear-gradient(135deg,#1a1a2e,#16213e)">${fallbackIcon}</div>`
        }
        ${card.score ? `<div class="browse-card-score">★ ${card.score}</div>` : ""}
        <div class="browse-card-type">${typeLabel}</div>
      </div>
      <div class="browse-card-body">
        <div class="browse-card-title">${esc(card.title)}</div>
        <div class="browse-card-meta">${card.year || ""}</div>
      </div>`;
  }

  // ── Navigate to detail ────────────────────────────────────
  function goToDetail(type, id) {
    window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  }

  // ── Load more ─────────────────────────────────────────────
  function loadMore() {
    if (currentPage >= totalPages) return;
    currentPage++;
    fetchResults(true);
  }

  // ── Switch type ───────────────────────────────────────────
  function switchType(type) {
    currentType = type;
    currentGenre = null;
    currentPage = 1;
    totalPages = 1;
    renderTabs();
    renderGenres();
    fetchResults(false);

    // Update hero title
    const titleSpan = document.getElementById("browse-type-label");
    if (titleSpan) {
      const labels = { movie: "Movies", tv: "TV Shows", anime: "Anime" };
      titleSpan.textContent = labels[type] || type;
    }
  }

  // ── Switch sort ───────────────────────────────────────────
  function switchSort(sort) {
    currentSort = sort;
    currentPage = 1;
    document
      .querySelectorAll(".sort-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.sort === sort));
    fetchResults(false);
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    Auth.init();

    // Read type from URL param
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    if (["movie", "tv", "anime"].includes(typeParam)) currentType = typeParam;

    // Type tab clicks
    document.querySelectorAll(".browse-type-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchType(btn.dataset.type));
    });

    // Sort button clicks
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchSort(btn.dataset.sort));
    });

    // Load more
    document
      .getElementById("btn-load-more")
      ?.addEventListener("click", loadMore);

    // Navbar scroll
    const navbar = document.getElementById("navbar");
    window.addEventListener(
      "scroll",
      () => {
        navbar?.classList.toggle("navbar--solid", window.scrollY > 20);
      },
      { passive: true },
    );

    // Initial title
    const titleSpan = document.getElementById("browse-type-label");
    if (titleSpan) {
      const labels = { movie: "Movies", tv: "TV Shows", anime: "Anime" };
      titleSpan.textContent = labels[currentType] || "Movies";
    }

    renderTabs();
    renderGenres();
    fetchResults(false);
  }

  return { init, selectGenre, switchType, switchSort, loadMore };
})();

document.addEventListener("DOMContentLoaded", Browse.init);
