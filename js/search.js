// ============================================================
// FlixRate – Search Results Page Module
// ============================================================
const SearchPage = (() => {
  let currentQuery = '';
  let currentType  = 'all';  // all | movie | tv | anime
  let currentPage  = 1;
  let totalPages   = 1;
  let isFetching   = false;

  const SUGGESTIONS = ['Demon Slayer', 'Avengers', 'Breaking Bad', 'Attack on Titan',
    'Inception', 'Jujutsu Kaisen', 'Game of Thrones', 'Interstellar',
    'One Piece', 'The Dark Knight', 'Naruto', 'Squid Game'];

  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function imgUrl(path) { return `https://image.tmdb.org/t/p/w342${path}`; }

  // ── Perform search ────────────────────────────────────────
  async function search(append = false) {
    if (isFetching || !currentQuery.trim()) return;
    isFetching = true;

    const grid = document.getElementById('search-results-grid');
    const moreWrap = document.getElementById('search-load-more-wrap');
    const moreBtn  = document.getElementById('search-more-btn');

    if (!append) {
      grid.innerHTML = `<div class="search-loading"><div class="search-spinner-lg"></div>Searching for "<strong>${esc(currentQuery)}</strong>"…</div>`;
      if (moreWrap) moreWrap.style.display = 'none';
      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('q', currentQuery);
      url.searchParams.set('type', currentType);
      window.history.replaceState({}, '', url);
    } else {
      if (moreBtn) { moreBtn.disabled = true; moreBtn.textContent = 'Loading…'; }
    }

    try {
      let results = [];

      if (currentType === 'anime') {
        results = await fetchAnime(currentQuery, currentPage);
      } else if (currentType === 'movie' || currentType === 'tv') {
        results = await fetchTMDB(currentType, currentQuery, currentPage);
      } else {
        // All: fetch all three and merge
        const [movies, tv, anime] = await Promise.all([
          fetchTMDB('movie', currentQuery, currentPage),
          fetchTMDB('tv', currentQuery, currentPage),
          fetchAnime(currentQuery, 1),
        ]);
        results = interleave(movies, tv, anime);
        totalPages = Math.max(totalPages, 1); // combined doesn't paginate cleanly
      }

      isFetching = false;

      if (!append) grid.innerHTML = '';

      if (!results.length && !append) {
        grid.innerHTML = `
          <div class="search-empty-full">
            <div class="search-empty-icon">🔍</div>
            <div class="search-empty-label">No results for "${esc(currentQuery)}"</div>
            <p style="font-size:0.85rem">Try a different spelling or browse by genre.</p>
          </div>`;
        updateCountLabel(0);
        if (moreWrap) moreWrap.style.display = 'none';
        return;
      }

      updateCountLabel(results.length + (append ? parseInt(document.querySelectorAll('.search-result-card').length) : 0));

      results.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'search-result-card';
        el.style.animationDelay = `${Math.min(idx * 0.04, 0.5)}s`;
        el.innerHTML = buildCard(item);
        el.onclick = () => { window.location.href = `detail.html?type=${item.type}&id=${item.id}`; };
        // Context-menu data attributes
        el.dataset.ctxId     = item.id;
        el.dataset.ctxType   = item.type;
        el.dataset.ctxTitle  = item.title  || '';
        el.dataset.ctxPoster = item.poster || '';
        el.dataset.ctxYear   = item.year   || '';
        el.dataset.ctxRating = item.score  || '';
        grid.appendChild(el);
      });

      if (moreWrap) moreWrap.style.display = (currentPage < totalPages && currentType !== 'all') ? 'flex' : 'none';
      if (moreBtn) { moreBtn.disabled = false; moreBtn.textContent = 'Load More'; }

    } catch(e) {
      console.error('Search error:', e);
      isFetching = false;
      if (!append) grid.innerHTML = `<div class="search-empty-full"><div class="search-empty-icon">⚠️</div><div class="search-empty-label">Search failed. Please try again.</div></div>`;
    }
  }

  // ── TMDB ──────────────────────────────────────────────────
  async function fetchTMDB(type, query, page) {
    const headers = { 'Authorization': `Bearer ${CONFIG.TMDB_BEARER}`, 'accept': 'application/json' };
    const url = `${CONFIG.TMDB_BASE}/search/${type}?query=${encodeURIComponent(query)}&page=${page}&language=en-US`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    totalPages = Math.min(data.total_pages || 1, 10);
    return (data.results || []).filter(m => m.poster_path).map(m => {
      const lr = API.getLocalRating(type, m.id);
      return {
        id:     m.id, type,
        title:  m.title || m.name,
        poster: imgUrl(m.poster_path),
        score:  lr.rating ? lr.rating.toFixed(1) : undefined,
        year:   (m.release_date || m.first_air_date || '').slice(0,4),
      };
    });
  }

  // ── Jikan ─────────────────────────────────────────────────
  async function fetchAnime(query, page) {
    const url = `${CONFIG.JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=true`;
    const res = await fetch(url);
    const data = await res.json();
    const pg = data.pagination || {};
    totalPages = Math.min(pg.last_visible_page || 1, 10);
    return (data.data || []).map(a => {
      const lr = API.getLocalRating('anime', a.mal_id);
      return {
        id:     a.mal_id, type: 'anime',
        title:  a.title_english || a.title,
        poster: a.images?.jpg?.image_url || null,
        score:  lr.rating ? lr.rating.toFixed(1) : undefined,
        year:   a.year || '',
      };
    });
  }

  // ── Interleave all three ───────────────────────────────────
  function interleave(movies, tv, anime) {
    const out = [];
    const max = Math.max(movies.length, tv.length, anime.length);
    for (let i = 0; i < max; i++) {
      if (movies[i]) out.push(movies[i]);
      if (tv[i])     out.push(tv[i]);
      if (anime[i])  out.push(anime[i]);
    }
    return out;
  }

  // ── Card HTML ─────────────────────────────────────────────
  function buildCard(item) {
    const typeLabel = item.type === 'anime' ? '🎌 Anime' : item.type === 'tv' ? '📺 TV' : '🎬 Movie';
    return `
      <div class="src-poster-wrap">
        ${item.poster
          ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" class="src-poster" loading="lazy">`
          : `<div class="src-poster-ph">${item.type==='anime'?'🎌':item.type==='tv'?'📺':'🎬'}</div>`
        }
        ${item.score ? `<div class="src-score">★ ${item.score}</div>` : ''}
        <div class="src-type">${typeLabel}</div>
      </div>
      <div class="src-body">
        <div class="src-title">${esc(item.title)}</div>
        <div class="src-meta">${item.year || ''}</div>
      </div>`;
  }

  // ── Update count label ─────────────────────────────────────
  function updateCountLabel(n) {
    const el = document.getElementById('search-count-label');
    if (el) el.textContent = n ? `${n}+ results` : '';
  }

  // ── Update hero query display ──────────────────────────────
  function updateQueryDisplay() {
    const el = document.getElementById('search-hero-query');
    if (el) el.innerHTML = `Results for <span>"${esc(currentQuery)}"</span>`;
    const inputEl = document.getElementById('search-page-input');
    if (inputEl) inputEl.value = currentQuery;
  }

  // ── Switch type ───────────────────────────────────────────
  function switchType(type) {
    currentType = type;
    currentPage = 1;
    totalPages  = 1;
    document.querySelectorAll('.search-tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));
    search(false);
  }

  // ── Load more ─────────────────────────────────────────────
  function loadMore() {
    if (currentPage >= totalPages) return;
    currentPage++;
    search(true);
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    Auth.init();

    // Read from URL
    const params = new URLSearchParams(window.location.search);
    currentQuery = params.get('q') || '';
    const typeParam = params.get('type') || 'all';
    if (['all','movie','tv','anime'].includes(typeParam)) currentType = typeParam;

    // Tabs
    document.querySelectorAll('.search-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.type === currentType);
      t.addEventListener('click', () => switchType(t.dataset.type));
    });

    // Search form
    const form = document.getElementById('search-page-form');
    form?.addEventListener('submit', e => {
      e.preventDefault();
      const val = document.getElementById('search-page-input')?.value.trim();
      if (val) { currentQuery = val; currentPage = 1; search(false); updateQueryDisplay(); }
    });

    // Load more
    document.getElementById('search-more-btn')?.addEventListener('click', loadMore);

    // Suggestion chips
    const chipsEl = document.getElementById('search-sugg-chips');
    if (chipsEl) {
      const chips = currentQuery ? [] : SUGGESTIONS.slice(0, 8);
      chipsEl.innerHTML = chips.map(s =>
        `<button class="search-sugg-chip" onclick="SearchPage.searchFor('${esc(s)}')">${s}</button>`
      ).join('');
      document.getElementById('search-sugg-wrap').style.display = chips.length ? 'block' : 'none';
    }

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar?.classList.toggle('navbar--solid', window.scrollY > 20);
    }, { passive: true });

    if (currentQuery) {
      updateQueryDisplay();
      search(false);
    } else {
      document.getElementById('search-hero-query').innerHTML = 'Search FlixRate';
      document.getElementById('search-results-grid').innerHTML = '';
    }
  }

  function searchFor(term) {
    currentQuery = term;
    currentPage  = 1;
    search(false);
    updateQueryDisplay();
    document.getElementById('search-sugg-wrap').style.display = 'none';
  }

  return { init, searchFor };
})();

document.addEventListener('DOMContentLoaded', SearchPage.init);
