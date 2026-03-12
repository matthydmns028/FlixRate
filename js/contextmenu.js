// ============================================================
// FlixRate – Custom Context Menu
// Right-click any media card for quick actions
// ============================================================
const ContextMenu = (() => {
  let menuEl   = null;
  let current  = null;   // { id, type, title, poster, year, rating }

  // ── Build DOM once ─────────────────────────────────────────
  function ensureMenu() {
    if (menuEl) return;
    menuEl = document.createElement('div');
    menuEl.id = 'ctx-menu';
    menuEl.className = 'ctx-menu';
    document.body.appendChild(menuEl);

    // Close on outside click / scroll
    document.addEventListener('click',    () => hide());
    document.addEventListener('scroll',   () => hide(), { passive: true });
    document.addEventListener('keydown',  e => { if (e.key === 'Escape') hide(); });
  }

  // ── Show ───────────────────────────────────────────────────
  function show(e, item) {
    e.preventDefault();
    e.stopPropagation();
    ensureMenu();
    current = item;

    const WL      = JSON.parse(localStorage.getItem('flixrate_wishlist') || '{}');
    const wlKey   = `${item.type}_${item.id}`;
    const inWL    = !!(WL[wlKey] && typeof WL[wlKey] === 'object');
    const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;

    // Build action list
    const actions = [
      { icon: '🎬', label: 'View Details',     id: 'detail',     cls: 'primary' },
      { divider: true },
    ];

    if (session) {
      actions.push(
        inWL
          ? { icon: '✅', label: 'In Watchlist — Remove', id: 'watchlist-remove', cls: 'success' }
          : { icon: '🔖', label: 'Add to Watchlist',       id: 'watchlist-add' }
      );
      actions.push({ icon: '🌟', label: 'Add to Highlights',  id: 'highlight' });
    } else {
      actions.push({ icon: '🔖', label: 'Add to Watchlist',   id: 'login', hint: 'Login required' });
      actions.push({ icon: '🌟', label: 'Add to Highlights',  id: 'login', hint: 'Login required' });
    }

    actions.push({ divider: true });
    actions.push({ icon: '📋', label: 'Copy Title', id: 'copy' });

    menuEl.innerHTML = `
      <div class="ctx-header">
        <span class="ctx-header-type">${item.type === 'anime' ? '🎌' : item.type === 'tv' ? '📺' : '🎬'} ${capitalize(item.type)}</span>
        <span class="ctx-header-title">${esc(item.title)}</span>
      </div>
      ${actions.map(a => {
        if (a.divider) return '<div class="ctx-divider"></div>';
        return `<button class="ctx-item${a.cls ? ' ctx-item--'+a.cls : ''}" data-action="${a.id}">
          <span class="ctx-icon">${a.icon}</span>
          <span class="ctx-label">${a.label}</span>
          ${a.hint ? `<span class="ctx-hint">${a.hint}</span>` : ''}
        </button>`;
      }).join('')}`;

    // Delegated click on actions
    menuEl.onclick = (ev) => {
      ev.stopPropagation();
      const btn = ev.target.closest('.ctx-item');
      if (btn) { handleAction(btn.dataset.action); }
    };

    // Position — open first so we can measure, then clamp
    menuEl.className = 'ctx-menu ctx-menu--open';

    requestAnimationFrame(() => {
      const mw = menuEl.offsetWidth  || 220;
      const mh = menuEl.offsetHeight || 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = e.clientX + 4;
      let y = e.clientY + 4;
      if (x + mw > vw - 8) x = e.clientX - mw - 4;
      if (y + mh > vh - 8) y = e.clientY - mh - 4;
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      menuEl.style.left = `${x + window.scrollX}px`;
      menuEl.style.top  = `${y + window.scrollY}px`;
    });
  }

  // ── Hide ───────────────────────────────────────────────────
  function hide() {
    if (!menuEl) return;
    menuEl.className = 'ctx-menu';
    current = null;
  }

  // ── Handle actions ─────────────────────────────────────────
  function handleAction(action) {
    hide();
    if (!current) return;
    const { id, type, title, poster, year, rating } = current;

    if (action === 'detail') {
      window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;

    } else if (action === 'watchlist-add') {
      const WL  = JSON.parse(localStorage.getItem('flixrate_wishlist') || '{}');
      const key = `${type}_${id}`;
      WL[key] = { id, type, title, poster: poster || null, year: year || '', rating: rating || null, addedAt: Date.now() };
      localStorage.setItem('flixrate_wishlist', JSON.stringify(WL));
      toast('Added to Watchlist 🔖');

    } else if (action === 'watchlist-remove') {
      const WL  = JSON.parse(localStorage.getItem('flixrate_wishlist') || '{}');
      const key = `${type}_${id}`;
      delete WL[key];
      localStorage.setItem('flixrate_wishlist', JSON.stringify(WL));
      toast('Removed from Watchlist');

    } else if (action === 'highlight') {
      const h = JSON.parse(localStorage.getItem('flixrate_profile_highlights') || 'null') || new Array(5).fill(null);
      if (h.some(s => s && s.id === id && s.type === type)) {
        toast('Already in your highlights!'); return;
      }
      const emptyIdx = h.findIndex(s => !s);
      if (emptyIdx === -1) {
        toast('Highlights full! Remove one from your profile.'); return;
      }
      h[emptyIdx] = { id, type, title, poster: poster || null, year: year || '', rating: rating || null };
      localStorage.setItem('flixrate_profile_highlights', JSON.stringify(h));
      toast(`Added "${title}" to Highlights 🌟`);

    } else if (action === 'copy') {
      navigator.clipboard?.writeText(title)
        .then(() => toast('Title copied! 📋'))
        .catch(() => toast('Copy not supported'));

    } else if (action === 'login') {
      window.location.href = 'login.html';
    }
  }

  // ── Toast ──────────────────────────────────────────────────
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'ctx-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    // Animate in
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 350);
    }, 2600);
  }

  // ── Helpers ────────────────────────────────────────────────
  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  // ── Global listener on document ────────────────────────────
  // Reads data-ctx-id / data-ctx-type / data-ctx-title / data-ctx-poster / data-ctx-year / data-ctx-rating
  // from any card element in the bubble path
  function initGlobal() {
    document.addEventListener('contextmenu', e => {
      const card = e.target.closest('[data-ctx-id]');
      if (!card) return;
      show(e, {
        id:     card.dataset.ctxId,
        type:   card.dataset.ctxType   || 'movie',
        title:  card.dataset.ctxTitle  || 'Unknown',
        poster: card.dataset.ctxPoster || null,
        year:   card.dataset.ctxYear   || '',
        rating: card.dataset.ctxRating || null,
      });
    });
  }

  return { show, hide, initGlobal, toast };
})();

// Boot immediately — works on every page that includes this script
ContextMenu.initGlobal();
