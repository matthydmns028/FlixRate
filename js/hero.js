// ============================================================
// FlixRate – Hero Section Module
// Controls the rotating hero carousel with color-adaptive UI
// ============================================================

const Hero = (() => {
  let items = [];
  let currentIndex = 0;
  let intervalId = null;
  let isTransitioning = false;

  const el = {
    get section()    { return document.getElementById('hero'); },
    get backdrop()   { return document.getElementById('hero-backdrop'); },
    get poster()     { return document.getElementById('hero-poster'); },
    get title()      { return document.getElementById('hero-title'); },
    get meta()       { return document.getElementById('hero-meta'); },
    get overview()   { return document.getElementById('hero-overview'); },
    get trailerBtn() { return document.getElementById('hero-trailer-btn'); },
    get listBtn()    { return document.getElementById('hero-list-btn'); },
    get dots()       { return document.getElementById('hero-dots'); },
    get prevBtn()    { return document.getElementById('hero-prev'); },
    get nextBtn()    { return document.getElementById('hero-next'); },
    get typeBadge()  { return document.getElementById('hero-type-badge'); },
  };

  async function renderItem(item) {
    if (!item) return;
    isTransitioning = true;

    // Fade out
    if (el.section) el.section.classList.add('hero--transitioning');

    await new Promise(r => setTimeout(r, 350));

    // ── Update backdrop ────────────────────────────────────
    if (el.backdrop) {
      el.backdrop.style.backgroundImage = `url("${item.backdrop}")`;
    }

    // ── Update poster ──────────────────────────────────────
    if (el.poster) {
      el.poster.src = item.poster || item.backdrop;
      el.poster.alt = item.title;
    }

    // ── Update text ────────────────────────────────────────
    if (el.title) el.title.textContent = item.title;

    // Make poster + title clickable → detail page
    const detailUrl = `detail.html?type=${item.type}&id=${item.id}`;
    if (el.poster) {
      el.poster.style.cursor = 'pointer';
      el.poster.onclick = () => window.location.href = detailUrl;
      el.poster.title = `View ${item.title} details`;
    }
    if (el.title) {
      el.title.style.cursor = 'pointer';
      el.title.onclick = () => window.location.href = detailUrl;
    }
    if (el.listBtn) {
      // Reflect current watchlist state
      const wlKey  = `${item.type}_${item.id}`;
      const WL     = JSON.parse(localStorage.getItem('flixrate_wishlist') || '{}');
      const inList = !!(WL[wlKey] && typeof WL[wlKey] === 'object');
      updateListBtn(el.listBtn, inList);

      el.listBtn.onclick = () => {
        const session = Auth.getSession();
        if (!session) { window.location.href = 'login.html'; return; }
        const store = JSON.parse(localStorage.getItem('flixrate_wishlist') || '{}');
        if (store[wlKey] && typeof store[wlKey] === 'object') {
          // Remove
          delete store[wlKey];
          localStorage.setItem('flixrate_wishlist', JSON.stringify(store));
          updateListBtn(el.listBtn, false);
          flashBtn(el.listBtn, '🗑 Removed');
        } else {
          // Add
          store[wlKey] = {
            id:      item.id,
            type:    item.type,
            title:   item.title,
            poster:  item.poster || item.backdrop || null,
            year:    item.year   || '',
            rating:  item.rating ? parseFloat(item.rating).toFixed(1) : null,
            addedAt: Date.now(),
          };
          localStorage.setItem('flixrate_wishlist', JSON.stringify(store));
          updateListBtn(el.listBtn, true);
          flashBtn(el.listBtn, '🔖 Saved!');
        }
      };
    }


    if (el.meta) {
      const lr = API.getLocalRating(item.type, item.id);
      const ratingVal = lr.rating;
      const votesVal = lr.votes;

      const stars = ratingToStars(ratingVal);
      const voteStr = votesVal ? `${formatVotes(votesVal)} PEOPLE VOTED` : '';
      const ratingStr = ratingVal ? `${parseFloat(ratingVal).toFixed(1)}/5` : '';
      const yearStr = item.year ? `<span class="hero-year">${item.year}</span>` : '';
      el.meta.innerHTML = `
        <span class="hero-vote-count">${voteStr}</span>
        ${stars}
        <span class="hero-rating">${ratingStr}</span>
        ${yearStr}`;
    }

    if (el.overview) {
      el.overview.textContent = item.overview.length > 280
        ? item.overview.slice(0, 280) + '…'
        : item.overview;
    }

    if (el.typeBadge) {
      el.typeBadge.textContent = item.type === 'anime' ? '🎌 ANIME' : item.type === 'movie' ? '🎬 MOVIE' : '📺 TV';
      el.typeBadge.className = `hero-type-badge hero-type-badge--${item.type}`;
    }

    // ── Update dots ────────────────────────────────────────
    updateDots();

    // Fade in
    if (el.section) el.section.classList.remove('hero--transitioning');
    isTransitioning = false;

    // ── Extract dominant color & apply to buttons ──────────
    applyDominantColor(item.backdrop);
  }

  async function applyDominantColor(imageUrl) {
    try {
      const color = await ColorExtractor.getDominantColor(imageUrl);
      const lightColor = ColorExtractor.lighten(color, 30);

      const btn = el.trailerBtn;
      if (!btn) return;

      // Apply color as background with gradient
      btn.style.background = `linear-gradient(135deg, ${color.css}, ${ColorExtractor.toRgbaString(lightColor, 1)})`;
      btn.style.boxShadow = `0 0 20px ${ColorExtractor.toRgbaString(color, 0.55)}, 0 4px 15px ${ColorExtractor.toRgbaString(color, 0.35)}`;
      btn.style.borderColor = ColorExtractor.toRgbaString(lightColor, 0.6);

      // Also tint the section glow overlay
      const section = el.section;
      if (section) {
        section.style.setProperty('--hero-color-r', color.r);
        section.style.setProperty('--hero-color-g', color.g);
        section.style.setProperty('--hero-color-b', color.b);
      }

      // Store for pulse animation
      btn.dataset.colorR = color.r;
      btn.dataset.colorG = color.g;
      btn.dataset.colorB = color.b;

    } catch (e) {
      console.warn('Color extraction failed:', e);
    }
  }

  // ── List button helpers ────────────────────────────────────
  function updateListBtn(btn, inList) {
    if (!btn) return;
    const span = btn.querySelector('span') || btn;
    span.textContent = inList ? '✓ In Watchlist' : '+ Add to List';
    btn.classList.toggle('btn-ghost--active', inList);
  }

  function flashBtn(btn, msg) {
    if (!btn) return;
    const span = btn.querySelector('span') || btn;
    const orig = span.textContent;
    span.textContent = msg;
    btn.style.transition = 'none';
    setTimeout(() => {
      span.textContent = orig;
      btn.style.transition = '';
    }, 1400);
  }

  function ratingToStars(rating) {
    if (!rating) return '';
    const normalized = Math.min(5, Math.max(0, parseFloat(rating)));
    const full = Math.floor(normalized);
    const half = normalized - full >= 0.4 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '<span class="hero-stars">';
    for (let i = 0; i < full; i++) html += '<span class="star star-full">★</span>';
    if (half) html += '<span class="star star-half">⯨</span>';
    for (let i = 0; i < empty; i++) html += '<span class="star star-empty">☆</span>';
    html += '</span>';
    return html;
  }

  function formatVotes(n) {
    if (!n) return '';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
  }

  function buildDots() {
    if (!el.dots) return;
    el.dots.innerHTML = '';
    items.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `hero-dot ${i === currentIndex ? 'hero-dot--active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      el.dots.appendChild(dot);
    });
  }

  function updateDots() {
    if (!el.dots) return;
    el.dots.querySelectorAll('.hero-dot').forEach((dot, i) => {
      dot.classList.toggle('hero-dot--active', i === currentIndex);
    });
  }

  function goTo(index) {
    if (isTransitioning) return;
    currentIndex = ((index % items.length) + items.length) % items.length;
    renderItem(items[currentIndex]);
    restartInterval();
  }

  function next() { goTo(currentIndex + 1); }
  function prev() { goTo(currentIndex - 1); }

  function startInterval() {
    intervalId = setInterval(() => goTo(currentIndex + 1), CONFIG.HERO_INTERVAL);
  }

  function restartInterval() {
    clearInterval(intervalId);
    startInterval();
  }

  function openTrailerModal(youtubeKey) {
    const modal = document.getElementById('trailer-modal');
    const iframe = document.getElementById('trailer-iframe');
    if (!modal || !iframe) return;
    iframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`;
    modal.classList.add('modal--open');
    document.body.style.overflow = 'hidden';
  }

  function closeTrailerModal() {
    const modal = document.getElementById('trailer-modal');
    const iframe = document.getElementById('trailer-iframe');
    if (!modal || !iframe) return;
    modal.classList.remove('modal--open');
    iframe.src = '';
    document.body.style.overflow = '';
  }

  async function handleTrailerClick() {
    const item = items[currentIndex];
    if (!item) return;

    const btn = el.trailerBtn;
    const origText = btn.innerHTML;
    btn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Loading…`;
    btn.disabled = true;

    try {
      const key = await item.trailerFn();
      if (key) {
        openTrailerModal(key);
      } else {
        // Fallback: search YouTube
        const searchQuery = encodeURIComponent(item.title + ' official trailer');
        window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
      }
    } catch (e) {
      console.warn('Trailer fetch error:', e);
    }

    btn.innerHTML = origText;
    btn.disabled = false;
  }

  async function init() {
    // Show skeleton immediately
    if (el.section) el.section.classList.add('hero--loading');

    // Wire up controls
    el.prevBtn?.addEventListener('click', prev);
    el.nextBtn?.addEventListener('click', next);
    el.trailerBtn?.addEventListener('click', handleTrailerClick);

    // Modal close
    document.getElementById('trailer-modal-close')?.addEventListener('click', closeTrailerModal);
    document.getElementById('trailer-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'trailer-modal') closeTrailerModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTrailerModal();
    });

    // Fetch hero items
    try {
      items = await API.fetchHeroItems();
    } catch (e) {
      console.error('Hero fetch failed:', e);
    }

    if (!el.section) return;
    el.section.classList.remove('hero--loading');

    if (items.length === 0) {
      el.section.innerHTML = '<p class="hero-error">Could not load content. Please check your API key.</p>';
      return;
    }

    buildDots();
    await renderItem(items[0]);
    startInterval();

    // Pause on hover
    el.section.addEventListener('mouseenter', () => clearInterval(intervalId));
    el.section.addEventListener('mouseleave', startInterval);
  }

  return { init, goTo, next, prev, closeTrailerModal };
})();
