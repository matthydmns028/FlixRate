const GlobalSearch = (() => {
  function init() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');

    if (!form || !input) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (q.length < 2) {
        if (resultsEl) resultsEl.classList.remove('search-results--open');
        return;
      }
      debounceTimer = setTimeout(() => performSearch(q), 450);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        resultsEl?.classList.add('search-results--open');
      }
    });

    document.addEventListener('click', (e) => {
      if (!form.contains(e.target)) {
        resultsEl?.classList.remove('search-results--open');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q);
    });
  }

  async function performSearch(query) {
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<p class="search-loading">Searching...</p>';
    resultsEl.classList.add('search-results--open');

    const [tmdbResults, animeResults] = await Promise.allSettled([
      window.API.searchTMDB(query),
      window.API.searchAnime(query),
    ]);

    const items = [];
    if (tmdbResults.status === 'fulfilled') {
      tmdbResults.value.slice(0, 4).forEach(r => {
        if (!r.poster_path) return;
        items.push({
          img: window.CONFIG.TMDB_IMG_W300 + r.poster_path,
          title: r.title || r.name,
          type: r.media_type === 'tv' ? '📺 Series' : '🎬 Movie',
          id: r.id,
          itemType: r.media_type === 'tv' ? 'tv' : 'movie',
        });
      });
    }
    if (animeResults.status === 'fulfilled') {
      animeResults.value.slice(0, 4).forEach(a => {
        const img = a.images?.jpg?.image_url;
        if (!img) return;
        items.push({
          img,
          title: a.title_english || a.title,
          type: '🌸 Anime',
          id: a.mal_id,
          itemType: 'anime',
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
    resultsEl.innerHTML = items.map(i => `
      <div class="search-result-item" onclick="window.location.href='detail.html?type=${i.itemType}&id=${i.id}'" style="cursor:pointer">
        <img src="${i.img}" alt="${i.title}" class="search-result-img">
        <div class="search-result-info">
          <span class="search-result-title">${i.title}</span>
          <span class="search-result-type">${i.type}</span>
        </div>
      </div>`).join('') + seeAll;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('search-input')) {
        GlobalSearch.init();
    }
});
