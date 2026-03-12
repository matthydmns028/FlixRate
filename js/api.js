// ============================================================
// FlixRate – API Module
// Handles all Jikan and TMDB API calls
// ============================================================

const API = (() => {
  // ── TMDB ──────────────────────────────────────────────────
  async function tmdb(endpoint, params = {}) {
    const url = new URL(`${CONFIG.TMDB_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CONFIG.TMDB_BEARER}`,
        'accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`TMDB ${endpoint} failed: ${res.status}`);
    return res.json();
  }

  async function fetchTrendingMovies() {
    const data = await tmdb("/trending/movie/week");
    return data.results || [];
  }

  async function fetchTrendingTV() {
    const data = await tmdb("/trending/tv/week");
    return data.results || [];
  }

  async function fetchPopularMovies() {
    const data = await tmdb("/movie/popular");
    return data.results || [];
  }

  async function fetchMovieTrailer(movieId) {
    const data = await tmdb(`/movie/${movieId}/videos`);
    const trailer = (data.results || []).find(
      (v) => v.type === "Trailer" && v.site === "YouTube",
    );
    return trailer ? trailer.key : null;
  }

  async function fetchTVTrailer(tvId) {
    const data = await tmdb(`/tv/${tvId}/videos`);
    const trailer = (data.results || []).find(
      (v) => v.type === "Trailer" && v.site === "YouTube",
    );
    return trailer ? trailer.key : null;
  }

  async function searchTMDB(query) {
    const data = await tmdb("/search/multi", { query });
    return data.results || [];
  }

  // ── JIKAN ─────────────────────────────────────────────────
  async function jikan(endpoint) {
    // Jikan has rate limiting – add delay between calls
    const url = `${CONFIG.JIKAN_BASE}${endpoint}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Jikan ${endpoint} failed: ${res.status}`);
    return res.json();
  }

  async function fetchTopAnime() {
    const data = await jikan("/top/anime?limit=20&filter=airing");
    return data.data || [];
  }

  async function fetchSeasonalAnime() {
    const data = await jikan("/seasons/now?limit=20");
    return data.data || [];
  }

  async function fetchAnimeById(id) {
    const data = await jikan(`/anime/${id}`);
    return data.data || null;
  }

  async function searchAnime(query) {
    const data = await jikan(`/anime?q=${encodeURIComponent(query)}&limit=10`);
    return data.data || [];
  }

  async function fetchSimilarAnime(genres, limit = 12) {
    // Fetch anime by genre to show as recommendations
    // genres is an array of genre names
    if (!genres || genres.length === 0) {
      return await fetchTopAnime();
    }

    try {
      // Get anime by the first genre
      const primaryGenre = genres[0];
      const data = await jikan(
        `/anime?genres=${encodeURIComponent(primaryGenre)}&limit=${limit}&status=airing`,
      );
      return data.data || [];
    } catch (e) {
      console.warn("Failed to fetch similar anime:", e.message);
      return await fetchTopAnime();
    }
  }

  // ── Hero content builder ─────────────────────────────────
  // Returns a unified array for the hero slider
  async function fetchHeroItems() {
    const items = [];

    try {
      const movies = await fetchTrendingMovies();
      movies.slice(0, 5).forEach((m) => {
        if (!m.backdrop_path) return;
        items.push({
          type: "movie",
          id: m.id,
          title: m.title || m.name,
          overview: m.overview,
          backdrop: CONFIG.TMDB_IMG_ORIGINAL + m.backdrop_path,
          poster: m.poster_path ? CONFIG.TMDB_IMG_W500 + m.poster_path : null,
          rating: m.vote_average,
          votes: m.vote_count,
          year: (m.release_date || "").slice(0, 4),
          trailerFn: () => fetchMovieTrailer(m.id),
        });
      });
    } catch (e) {
      console.warn("TMDB trending movies error:", e.message);
    }

    // Delay before Jikan call
    await new Promise((r) => setTimeout(r, 400));

    try {
      const anime = await fetchTopAnime();
      anime.slice(0, 5).forEach((a) => {
        const img = a.images?.jpg?.large_image_url;
        if (!img) return;
        items.push({
          type: "anime",
          id: a.mal_id,
          title: a.title_english || a.title,
          overview: a.synopsis || "",
          backdrop: img,
          poster: img,
          rating: a.score,
          votes: a.scored_by,
          year: a.year || "",
          trailerFn: () => Promise.resolve(a.trailer?.youtube_id || null),
        });
      });
    } catch (e) {
      console.warn("Jikan top anime error:", e.message);
    }

    // Shuffle the items for variety
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }

  // ── Local FlixRate Ratings ──────────────────────────────
  // Returns exclusively local rating data from localStorage
  function getLocalRating(type, id) {
    const all = JSON.parse(localStorage.getItem('flixrate_ratings') || '{}');
    const key = `${type}_${id}`;
    const item = all[key];
    if (!item || !item.count) return { rating: 0, votes: 0 };
    const rawRating = item.total / item.count;
    const rating = Math.min(5, Math.max(0, rawRating));
    return { rating, votes: item.count };
  }

  return {
    fetchTrendingMovies,
    fetchTrendingTV,
    fetchPopularMovies,
    fetchMovieTrailer,
    fetchTVTrailer,
    fetchTopAnime,
    fetchSeasonalAnime,
    fetchAnimeById,
    searchTMDB,
    searchAnime,
    fetchSimilarAnime,
    fetchHeroItems,
    getLocalRating,
    // Generic raw helpers (used by profile highlight picker)
    tmdbRaw:  (endpoint, params = {}) => tmdb(endpoint, params),
    jikanRaw: (endpoint) => jikan(endpoint),
  };
})();
