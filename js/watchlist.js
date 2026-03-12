// ============================================================
// FlixRate – Watchlist Page Module
// ============================================================
const Watchlist = (() => {
  let filter = 'all';   // all | movie | tv | anime
  let sort   = 'newest'; // newest | oldest | rating | title

  function getStore() {
    return JSON.parse(localStorage.getItem('flixrate_wishlist') || '{}');
  }

  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getItems() {
    const store = getStore();
    return Object.values(store).filter(v => v && typeof v === 'object');
  }

  function applyFilter(items) {
    if (filter === 'all') return items;
    return items.filter(i => i.type === filter);
  }

  function applySort(items) {
    return [...items].sort((a, b) => {
      if (sort === 'newest')  return (b.addedAt||0) - (a.addedAt||0);
      if (sort === 'oldest')  return (a.addedAt||0) - (b.addedAt||0);
      if (sort === 'rating')  return (parseFloat(b.rating)||0) - (parseFloat(a.rating)||0);
      if (sort === 'title')   return (a.title||'').localeCompare(b.title||'');
      return 0;
    });
  }

  function removeItem(key) {
    const store = getStore();
    delete store[key];
    localStorage.setItem('flixrate_wishlist', JSON.stringify(store));
    render();
  }

  function render() {
    const raw    = getItems();
    const items  = applySort(applyFilter(raw));
    const grid   = document.getElementById('watchlist-grid');
    const countEl= document.getElementById('wl-count');
    if (!grid) return;

    // Update count badge
    if (countEl) countEl.textContent = `${raw.length} saved`;

    // Update filter buttons to show counts
    ['all','movie','tv','anime'].forEach(f => {
      const btn = document.querySelector(`.wl-filter-btn[data-filter="${f}"]`);
      if (!btn) return;
      const c = f === 'all' ? raw.length : raw.filter(i => i.type === f).length;
      btn.querySelector('.wl-filter-count').textContent = c;
    });

    if (!items.length) {
      grid.innerHTML = `
        <div class="watchlist-empty" style="grid-column:1/-1">
          <div class="watchlist-empty-icon">${filter === 'all' ? '🔖' : filter === 'anime' ? '🎌' : filter === 'tv' ? '📺' : '🎬'}</div>
          <div class="watchlist-empty-title">${filter === 'all' ? 'Your watchlist is empty' : `No ${filter === 'movie' ? 'movies' : filter === 'tv' ? 'TV shows' : 'anime'} saved yet`}</div>
          <div class="watchlist-empty-sub">Save titles from any detail page to revisit them later.</div>
          <a href="browse.html" class="wl-browse-btn">🔍 Browse Content</a>
        </div>`;
      return;
    }

    grid.innerHTML = items.map((item, idx) => {
      const key = `${item.type}_${item.id}`;
      const typeLabel = item.type === 'anime' ? '🎌 Anime' : item.type === 'tv' ? '📺 TV' : '🎬 Movie';
      const delay = Math.min(idx * 0.04, 0.6);
      const lr = API.getLocalRating(item.type, item.id);
      const ratingStr = lr.rating ? lr.rating.toFixed(1) : '';
      return `
        <div class="wl-card" onclick="Watchlist.go('${esc(item.type)}','${item.id}')" style="animation-delay:${delay}s">
          <div class="wl-card-poster-wrap">
            ${item.poster
              ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" class="wl-card-poster" loading="lazy">`
              : `<div class="wl-card-poster-placeholder">${item.type==='anime'?'🎌':item.type==='tv'?'📺':'🎬'}</div>`
            }
            ${ratingStr ? `<div class="wl-card-score">★ ${ratingStr}</div>` : ''}
            <div class="wl-card-type-badge">${typeLabel}</div>
            <button class="wl-card-remove" onclick="event.stopPropagation();Watchlist.remove('${key}')">✕ Remove</button>
          </div>
          <div class="wl-card-body">
            <div class="wl-card-title">${esc(item.title)}</div>
            <div class="wl-card-meta">${item.year || ''}</div>
          </div>
        </div>`;
    }).join('');
  }

  function go(type, id) {
    window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  }

  function init() {
    Auth.init();

    // Filter buttons
    document.querySelectorAll('.wl-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        document.querySelectorAll('.wl-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });

    // Sort select
    const sortSel = document.getElementById('wl-sort');
    sortSel?.addEventListener('change', () => { sort = sortSel.value; render(); });

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar?.classList.toggle('navbar--solid', window.scrollY > 20);
    }, { passive: true });

    render();
  }

  return { init, remove: removeItem, go };
})();

document.addEventListener('DOMContentLoaded', Watchlist.init);
