// ============================================================
// FlixRate – Profile Page Module
// ============================================================

const Profile = (() => {
  const AVATAR_KEY = "flixrate_profile_avatar";
  const SETTINGS_KEY = "flixrate_profile_settings";
  const HIGHLIGHTS_KEY = "flixrate_profile_highlights";
  const MAX_HIGHLIGHTS = 5;

  let pickerSlotIndex = null; // which slot (0-4) is being filled
  let pickerSearch = null; // debounce timer
  let pickerType = "movie"; // current picker type tab

  // ── Storage helpers ────────────────────────────────────────
  function getSettings() {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s
      ? JSON.parse(s)
      : { displayName: "", bio: "", joinDate: Date.now() };
  }
  function saveSettings(obj) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
  }

  function getAvatar() {
    return localStorage.getItem(AVATAR_KEY) || null;
  }
  function saveAvatar(data) {
    localStorage.setItem(AVATAR_KEY, data);
  }
  function removeAvatar() {
    localStorage.removeItem(AVATAR_KEY);
  }

  function getHighlights() {
    const h = localStorage.getItem(HIGHLIGHTS_KEY);
    return h ? JSON.parse(h) : new Array(MAX_HIGHLIGHTS).fill(null);
  }
  function saveHighlights(arr) {
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(arr));
  }

  function getUserRatings() {
    const session = Auth.getSession();
    if (!session) return {};
    const key = `flixrate_ratings_${session.username}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  function getWishlist() {
    const data = localStorage.getItem("flixrate_wishlist");
    if (!data) return [];
    const store = JSON.parse(data);
    // store is { "movie_123": {id, type, title, poster, year, rating, addedAt}, ... }
    return Object.values(store)
      .filter((v) => v && typeof v === "object" && v.id)
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  function getForumPosts() {
    const session = Auth.getSession();
    if (!session) return [];
    const posts = JSON.parse(
      localStorage.getItem("flixrate_forum_posts") || "[]",
    );
    return posts.filter((p) => p.author === session.username);
  }

  // ── Helpers ────────────────────────────────────────────────
  function timeAgo(ts) {
    if (!ts) return "";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(ts).toLocaleDateString();
  }
  function avatarColor(str) {
    let h = 0;
    for (let i = 0; i < (str || "a").length; i++)
      h = (str || "a").charCodeAt(i) + ((h << 5) - h);
    return `hsl(${((h % 360) + 360) % 360},65%,50%)`;
  }
  function avatarLetter(name) {
    return (name || "?").charAt(0).toUpperCase();
  }
  function esc(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function memberBadge(joinDate) {
    const monthsOld = (Date.now() - joinDate) / (1000 * 60 * 60 * 24 * 30);
    const ratings = Object.keys(getUserRatings()).length;
    if (ratings >= 50 || monthsOld >= 12)
      return { label: "Legendary", cls: "badge-legendary" };
    if (ratings >= 10 || monthsOld >= 3)
      return { label: "Critic", cls: "badge-critic" };
    return { label: "Member", cls: "badge-member" };
  }

  // ── Render profile header ─────────────────────────────────
  function renderHeader() {
    const session = Auth.getSession();
    const settings = getSettings();
    const avatar = getAvatar();
    const ratings = getUserRatings();
    const wishlist = getWishlist();
    const posts = getForumPosts();
    const badge = memberBadge(settings.joinDate);

    const displayName = settings.displayName || session.username;
    const username = session.username;

    // Avatar element
    const avatarEl = document.getElementById("profile-avatar-display");
    if (avatarEl) {
      if (avatar) {
        avatarEl.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        avatarEl.style.background = avatarColor(username);
        avatarEl.textContent = avatarLetter(username);
      }
    }

    // Settings preview avatar
    const settingsAvEl = document.getElementById("settings-avatar-preview");
    if (settingsAvEl) {
      if (avatar) {
        settingsAvEl.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        settingsAvEl.style.background = avatarColor(username);
        settingsAvEl.textContent = avatarLetter(username);
      }
    }

    // Name, username, badge
    const nameEl = document.getElementById("profile-display-name");
    if (nameEl) nameEl.textContent = displayName;
    const usernameEl = document.getElementById("profile-username");
    if (usernameEl) usernameEl.textContent = `@${username}`;
    const badgeEl = document.getElementById("profile-badge");
    if (badgeEl) {
      badgeEl.textContent = badge.label;
      badgeEl.className = `profile-badge ${badge.cls}`;
    }

    // Bio
    const bioEl = document.getElementById("profile-bio");
    if (bioEl) {
      if (settings.bio) {
        bioEl.innerHTML = `<span>${esc(settings.bio)}</span>`;
      } else {
        bioEl.innerHTML = `<span class="profile-bio-placeholder">No bio yet — edit your profile to add one.</span>`;
      }
    }

    // Stats
    const ratingCount = Object.keys(ratings).length;
    const wishlistCount = wishlist.length;
    const postCount = posts.length;
    document.getElementById("stat-ratings") &&
      (document.getElementById("stat-ratings").textContent = ratingCount);
    document.getElementById("stat-wishlist") &&
      (document.getElementById("stat-wishlist").textContent = wishlistCount);
    document.getElementById("stat-posts") &&
      (document.getElementById("stat-posts").textContent = postCount);

    // Pre-fill settings panel
    const settingsName = document.getElementById("settings-display-name");
    const settingsBio = document.getElementById("settings-bio");
    if (settingsName) settingsName.value = settings.displayName || "";
    if (settingsBio) settingsBio.value = settings.bio || "";
  }

  // ── Render highlights ──────────────────────────────────────
  function renderHighlights() {
    const highlights = getHighlights();
    const grid = document.getElementById("highlights-grid");
    if (!grid) return;

    grid.innerHTML = highlights
      .map((item, i) => {
        if (!item)
          return `
        <div class="highlight-slot empty" onclick="Profile.openPicker(${i})">
          <span class="highlight-add-icon">＋</span>
          <span class="highlight-add-text">Add #${i + 1}</span>
        </div>`;

        const poster = item.poster
          ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" class="highlight-poster" loading="lazy">`
          : `<div class="highlight-poster" style="background:${avatarColor(item.title || "?")};display:flex;align-items:center;justify-content:center;font-size:2rem">🎬</div>`;

        return `
        <div class="highlight-slot filled" title="${esc(item.title)}">
          <span class="highlight-rank">${i + 1}</span>
          ${poster}
          <button class="highlight-remove" onclick="event.stopPropagation();Profile.removeHighlight(${i})" aria-label="Remove">✕</button>
          <div class="highlight-overlay" onclick="Profile.goToDetail('${esc(item.type)}','${item.id}')">
            <div class="highlight-title">${esc(item.title)}</div>
            <span class="highlight-type-badge">${item.type === "anime" ? "🎌" : item.type === "tv" ? "📺" : "🎬"} ${item.type}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  // ── Navigate to detail page ───────────────────────────────
  function goToDetail(type, id) {
    window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  }

  // ── Remove highlight ───────────────────────────────────────
  function removeHighlight(index) {
    const h = getHighlights();
    h[index] = null;
    saveHighlights(h);
    renderHighlights();
    showToast("Removed from highlights");
  }

  // ── Open picker modal ──────────────────────────────────────
  function openPicker(slotIndex) {
    pickerSlotIndex = slotIndex;
    pickerType = "movie";

    const modal = document.getElementById("picker-modal-backdrop");
    modal?.classList.add("open");
    document.body.style.overflow = "hidden";

    // Reset state
    const searchInput = document.getElementById("picker-search-input");
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    document.querySelectorAll(".picker-type-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === "movie");
    });

    // Load trending to start
    searchPicker("");
  }

  function closePicker() {
    document.getElementById("picker-modal-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
    pickerSlotIndex = null;
  }

  // ── Picker search ─────────────────────────────────────────
  async function searchPicker(query) {
    const resultsEl = document.getElementById("picker-results");
    if (!resultsEl) return;

    resultsEl.innerHTML = `<div class="picker-loading"><div class="picker-spinner"></div>Searching…</div>`;

    try {
      let items = [];

      if (pickerType === "movie" || pickerType === "tv") {
        const endpoint = query
          ? pickerType === "movie"
            ? `/search/movie`
            : `/search/tv`
          : pickerType === "movie"
            ? `/trending/movie/week`
            : `/trending/tv/week`;
        const params = query ? { query } : {};
        const data = await API.tmdbRaw(endpoint, params);
        const results = data.results || [];
        items = results.slice(0, 15).map((m) => ({
          id: m.id,
          type: pickerType,
          title: m.title || m.name,
          poster: m.poster_path ? CONFIG.TMDB_IMG_W500 + m.poster_path : null,
          year: (m.release_date || m.first_air_date || "").slice(0, 4),
          score: m.vote_average ? m.vote_average.toFixed(1) : "—",
        }));
      } else {
        // Anime via Jikan
        const endpoint = query
          ? `/anime?q=${encodeURIComponent(query)}&limit=15`
          : `/top/anime?limit=15`;
        const data = await API.jikanRaw(endpoint);
        const results = data.data || [];
        items = results.map((a) => ({
          id: a.mal_id,
          type: "anime",
          title: a.title_english || a.title,
          poster: a.images?.jpg?.image_url || null,
          year: a.year || "",
          score: a.score ? a.score.toFixed(1) : "—",
        }));
      }

      if (!items.length) {
        resultsEl.innerHTML = `<div class="picker-empty">No results found. Try a different search.</div>`;
        return;
      }

      // Render using base64-encoded data-item to avoid HTML-entity corruption
      resultsEl.innerHTML = items
        .map((item) => {
          const dataVal = btoa(
            unescape(encodeURIComponent(JSON.stringify(item))),
          );
          return `
          <div class="picker-result-item" data-item="${dataVal}" role="button" tabindex="0" style="cursor:pointer">
            ${
              item.poster
                ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" class="picker-result-poster" loading="lazy">`
                : `<div class="picker-result-poster" style="background:${avatarColor(item.title)};display:flex;align-items:center;justify-content:center;font-size:1.2rem">🎬</div>`
            }
            <div class="picker-result-info">
              <div class="picker-result-title">${esc(item.title)}</div>
              <div class="picker-result-meta">${item.type === "anime" ? "🎌 Anime" : item.type === "tv" ? "📺 TV" : "🎬 Movie"}${item.year ? ` · ${item.year}` : ""}</div>
            </div>
            <div class="picker-result-score">★ ${item.score}</div>
          </div>`;
        })
        .join("");

      // Delegated click — reads base64 data-item, decodes, parses, selects
      resultsEl.onclick = (e) => {
        const row = e.target.closest(".picker-result-item");
        if (!row) return;
        try {
          const item = JSON.parse(
            decodeURIComponent(escape(atob(row.dataset.item))),
          );
          selectItemObj(item);
        } catch (err) {
          console.error("Highlight select parse error:", err);
        }
      };
    } catch (e) {
      console.error("Picker search error:", e);
      resultsEl.innerHTML = `<div class="picker-empty">Search failed. Please try again.</div>`;
    }
  }

  function selectItemObj(item) {
    if (pickerSlotIndex === null) return;

    const h = getHighlights();
    // Check if already highlighted
    if (h.some((s) => s && s.id === item.id && s.type === item.type)) {
      showToast("Already in your highlights!");
      return;
    }
    h[pickerSlotIndex] = item;
    saveHighlights(h);
    renderHighlights();
    closePicker();
    showToast(`Added "${item.title}" to highlight #${pickerSlotIndex + 1} 🌟`);
  }

  // Legacy shim — kept in case anything calls the old string API
  function selectItem(jsonStr) {
    selectItemObj(typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr);
  }

  // ── Recent activity ────────────────────────────────────────
  function renderActivity() {
    const el = document.getElementById("activity-list");
    if (!el) return;

    const session = Auth.getSession();
    const activities = [];

    // Forum posts
    getForumPosts()
      .slice(0, 5)
      .forEach((p) => {
        activities.push({
          icon: "💬",
          color: "rgba(124,58,237,0.15)",
          text: `Posted <strong>${esc(p.title || p.text?.slice(0, 40) || "a post")}</strong> in the forum`,
          ts: p.ts,
        });
      });

    // Ratings
    const ratings = getUserRatings();
    Object.entries(ratings)
      .slice(0, 5)
      .forEach(([key, valObj]) => {
        const val = valObj.val;
        const ts = valObj.ts;
        const [type, id] = key.split("_");
        const titleName = valObj.title ? esc(valObj.title) : type;
        activities.push({
          icon: "⭐",
          color: "rgba(251,191,36,0.12)",
          text: `Rated <strong>${titleName}</strong> <strong>${val}/5</strong>`,
          ts: ts || Date.now() - Math.random() * 86400000 * 3,
        });
      });

    // Wishlist
    getWishlist()
      .slice(0, 3)
      .forEach((w) => {
        activities.push({
          icon: "🔖",
          color: "rgba(34,197,94,0.12)",
          text: `Added <strong>${esc(w.title || "an item")}</strong> to watchlist`,
          ts: w.addedAt || Date.now() - Math.random() * 86400000 * 5,
        });
      });

    activities.sort((a, b) => b.ts - a.ts);

    if (!activities.length) {
      el.innerHTML = `<div class="activity-empty">No activity yet. Start rating, posting, and saving content!</div>`;
      return;
    }

    el.innerHTML = activities
      .slice(0, 8)
      .map(
        (a) => `
      <div class="activity-item">
        <div class="activity-icon" style="background:${a.color}">${a.icon}</div>
        <div class="activity-info">
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${timeAgo(a.ts)}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  // ── Watchlist mini widget ─────────────────────────────────
  function renderWatchlistMini() {
    const el = document.getElementById("watchlist-mini-list");
    if (!el) return;
    const list = getWishlist().slice(0, 5);
    if (!list.length) {
      el.innerHTML = `<div class="watchlist-empty">Your watchlist is empty.</div>`;
      return;
    }
    el.innerHTML = list
      .map(
        (w) => `
      <div class="watchlist-mini-item" onclick="Profile.goToDetail('${esc(w.type || "movie")}','${w.id}')">
        ${
          w.poster
            ? `<img src="${esc(w.poster)}" class="watchlist-mini-poster" alt="${esc(w.title)}">`
            : `<div class="watchlist-mini-poster" style="background:${avatarColor(w.title || "?")};border-radius:5px"></div>`
        }
        <div class="watchlist-mini-title">${esc(w.title)}</div>
      </div>`,
      )
      .join("");
  }

  // ── Genre tags widget ─────────────────────────────────────
  function renderGenreTags() {
    const el = document.getElementById("genre-tags");
    if (!el) return;
    const settings = getSettings();
    const tags = settings.genres?.length ? settings.genres : [];
    if (!tags.length) {
      el.innerHTML =
        '<span style="font-size:0.8rem;color:var(--text-muted)">No favourite genres set — edit your profile to add some.</span>';
      return;
    }
    el.innerHTML = tags
      .map((g) => `<span class="genre-tag">${esc(g)}</span>`)
      .join("");
  }

  // ── Rated items tab ───────────────────────────────────────
  function renderRatedTab() {
    const el = document.getElementById("tab-rated-grid");
    if (!el) return;
    const ratings = getUserRatings();
    const entries = Object.entries(ratings);
    if (!entries.length) {
      el.innerHTML = `<div class="tab-empty">You haven't rated anything yet. Rate movies and anime from the detail page!</div>`;
      return;
    }
    el.innerHTML =
      `<div class="rated-grid">` +
      entries
        .slice(0, 20)
        .map(([key, scoreObj]) => {
          const score = scoreObj.val;
          const [type, ...idParts] = key.split("_");
          const id = idParts.join("_");
          
          const titleText = scoreObj.title ? esc(scoreObj.title) : `${esc(type)} · ${id.slice(0, 6)}`;
          const posterHtml = scoreObj.poster 
            ? `<img src="${esc(scoreObj.poster)}" alt="${titleText}" style="width:100%;height:100%;object-fit:cover;">`
            : (type === "anime" ? "🎌" : type === "tv" ? "📺" : "🎬");

          return `
          <div class="rated-card" onclick="Profile.goToDetail('${esc(type)}','${id}')">
            <div class="rated-card-poster" style="background:${avatarColor(key)};display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;">
              ${posterHtml}
            </div>
            <div class="rated-card-body">
              <div class="rated-card-title">${titleText}</div>
              <div class="rated-card-score">★ ${score}/5</div>
            </div>
          </div>`;
        })
        .join("") +
      `</div>`;
  }

  // ── Tab switching ─────────────────────────────────────────
  function switchTab(tabId) {
    document.querySelectorAll(".profile-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tabId);
    });
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.style.display = p.id === `panel-${tabId}` ? "block" : "none";
    });
    if (tabId === "rated") renderRatedTab();
    if (tabId === "activity") renderActivity();
  }

  // ── Avatar upload ─────────────────────────────────────────
  function handleAvatarUpload(file) {
    if (!file?.type.startsWith("image/")) {
      showToast("Select an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast("Image must be under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      saveAvatar(e.target.result);
      renderHeader();
      if (typeof Auth !== "undefined" && Auth.updateNavbar) Auth.updateNavbar();
      showToast("Profile picture updated! 🎉");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    removeAvatar();
    renderHeader();
    if (typeof Auth !== "undefined" && Auth.updateNavbar) Auth.updateNavbar();
    showToast("Profile picture removed.");
  }

  // ── Settings panel ────────────────────────────────────────
  function openSettings() {
    document.getElementById("settings-panel")?.classList.add("open");
    document.getElementById("settings-backdrop")?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeSettings() {
    document.getElementById("settings-panel")?.classList.remove("open");
    document.getElementById("settings-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
  }
  function saveSettingsForm() {
    const displayName =
      document.getElementById("settings-display-name")?.value.trim() || "";
    const bio = document.getElementById("settings-bio")?.value.trim() || "";
    const existing = getSettings();
    saveSettings({ ...existing, displayName, bio });
    closeSettings();
    renderAll();
    showToast("Profile saved! ✅");
  }

  // ── Toast ─────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById("profile-toast");
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(10px)";
    }, 2500);
  }

  // ── Render all ────────────────────────────────────────────
  function renderAll() {
    renderHeader();
    renderHighlights();
    renderActivity();
    renderWatchlistMini();
    renderGenreTags();
  }

  // ── Auth gate ─────────────────────────────────────────────
  function showAuthGate() {
    const main = document.getElementById("profile-main");
    if (main)
      main.innerHTML = `
      <div class="profile-auth-gate">
        <div class="auth-gate-icon">🔒</div>
        <h2 class="auth-gate-title">Sign in to view your profile</h2>
        <p class="auth-gate-sub">Create an account or log in to manage your profile, highlights, and activity.</p>
        <a href="login.html" style="display:inline-block;padding:13px 32px;border-radius:50px;
          background:linear-gradient(135deg,var(--accent),var(--accent-light));
          color:white;font-weight:700;text-decoration:none;font-size:0.95rem;
          box-shadow:0 4px 16px rgba(124,58,237,0.35);transition:opacity 0.18s"
          onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
          Sign In or Register
        </a>
      </div>`;
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    Auth.init();
    const session = Auth.getSession();
    if (!session) {
      showAuthGate();
      return;
    }

    // Ensure joinDate is set
    const settings = getSettings();
    if (!settings.joinDate) {
      settings.joinDate = Date.now();
      saveSettings(settings);
    }

    renderAll();
    Friends.init();

    // Avatar upload (click on avatar)
    const avatarWrap = document.getElementById("profile-avatar-container");
    const avatarInput = document.getElementById("avatar-file-input");
    avatarWrap?.addEventListener("click", () => avatarInput?.click());
    avatarInput?.addEventListener("change", (e) =>
      handleAvatarUpload(e.target.files[0]),
    );

    // Settings avatar upload button
    document
      .getElementById("btn-upload-avatar")
      ?.addEventListener("click", () => avatarInput?.click());
    document
      .getElementById("btn-remove-avatar")
      ?.addEventListener("click", handleRemoveAvatar);

    // Edit profile panel
    document
      .getElementById("btn-edit-profile")
      ?.addEventListener("click", openSettings);
    document
      .getElementById("settings-close")
      ?.addEventListener("click", closeSettings);
    document
      .getElementById("settings-backdrop")
      ?.addEventListener("click", closeSettings);
    document
      .getElementById("btn-save-settings")
      ?.addEventListener("click", saveSettingsForm);
    document
      .getElementById("btn-cancel-settings")
      ?.addEventListener("click", closeSettings);

    // Share profile
    document
      .getElementById("btn-share-profile")
      ?.addEventListener("click", () => {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        showToast("Profile link copied!");
      });

    // Picker modal
    document
      .getElementById("picker-modal-backdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "picker-modal-backdrop") closePicker();
      });
    document
      .getElementById("picker-close")
      ?.addEventListener("click", closePicker);

    // Picker search input
    const pickerSearchInput = document.getElementById("picker-search-input");
    pickerSearchInput?.addEventListener("input", () => {
      clearTimeout(pickerSearch);
      pickerSearch = setTimeout(
        () => searchPicker(pickerSearchInput.value.trim()),
        400,
      );
    });

    // Picker type tabs
    document.querySelectorAll(".picker-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        pickerType = btn.dataset.type;
        document
          .querySelectorAll(".picker-type-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        searchPicker(pickerSearchInput?.value.trim() || "");
      });
    });

    // Profile tabs
    document.querySelectorAll(".profile-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    // Escape closes modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePicker();
        closeSettings();
        Friends.close();
      }
    });
  }

  return {
    init,
    openPicker,
    closePicker,
    selectItem,
    removeHighlight,
    goToDetail,
  };
})();

// ============================================================
// Friends Module
// ============================================================
const Friends = (() => {
  // Storage keys — per logged-in user
  function key(suffix) {
    const s = Auth.getSession();
    return s ? `flixrate_friends_${suffix}_${s.username}` : null;
  }
  function getFriends() {
    const k = key("list");
    return k ? JSON.parse(localStorage.getItem(k) || "[]") : [];
  }
  function getSentReqs() {
    const k = key("sent");
    return k ? JSON.parse(localStorage.getItem(k) || "[]") : [];
  }
  function getIncoming() {
    const k = key("incoming");
    return k ? JSON.parse(localStorage.getItem(k) || "[]") : [];
  }
  function saveFriends(a) {
    const k = key("list");
    if (k) localStorage.setItem(k, JSON.stringify(a));
  }
  function saveSentReqs(a) {
    const k = key("sent");
    if (k) localStorage.setItem(k, JSON.stringify(a));
  }
  function saveIncoming(a) {
    const k = key("incoming");
    if (k) localStorage.setItem(k, JSON.stringify(a));
  }

  // Helper: avatar
  function avatarColor(str) {
    let h = 0;
    for (let i = 0; i < (str || "a").length; i++)
      h = (str || "a").charCodeAt(i) + ((h << 5) - h);
    return `hsl(${((h % 360) + 360) % 360},65%,50%)`;
  }
  function avatarLetter(n) {
    return (n || "?").charAt(0).toUpperCase();
  }
  function esc(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ── Known users (scan localStorage for registered accounts) ─
  function findUsers(query) {
    const session = Auth.getSession();
    const q = (query || "").toLowerCase();
    const users = [];
    // Auth.js stores users in flixrate_users
    const allUsers = JSON.parse(localStorage.getItem("flixrate_users") || "[]");
    allUsers.forEach((u) => {
      if (u.username === session?.username) return; // exclude self
      if (!q || u.username.toLowerCase().includes(q)) {
        users.push(u.username);
      }
    });
    return users.slice(0, 20);
  }

  // ── Relationship status for a given username ──────────────
  function getStatus(username) {
    if (getFriends().includes(username)) return "friends";
    if (getSentReqs().includes(username)) return "pending";
    // Check if they sent us a request
    if (getIncoming().includes(username)) return "incoming";
    return "none";
  }

  // ── Actions ───────────────────────────────────────────────
  function sendRequest(to) {
    const sent = getSentReqs();
    if (sent.includes(to)) return;
    sent.push(to);
    saveSentReqs(sent);
    // Write to their incoming list too
    const session = Auth.getSession();
    const theirKey = `flixrate_friends_incoming_${to}`;
    const theirIncoming = JSON.parse(localStorage.getItem(theirKey) || "[]");
    if (!theirIncoming.includes(session.username)) {
      theirIncoming.push(session.username);
      localStorage.setItem(theirKey, JSON.stringify(theirIncoming));
    }
    renderAll();
    showProfileToast(`Friend request sent to @${to}! 👋`);
  }

  function cancelRequest(to) {
    saveSentReqs(getSentReqs().filter((u) => u !== to));
    // Remove from their incoming
    const session = Auth.getSession();
    const theirKey = `flixrate_friends_incoming_${to}`;
    const theirIncoming = JSON.parse(
      localStorage.getItem(theirKey) || "[]",
    ).filter((u) => u !== session.username);
    localStorage.setItem(theirKey, JSON.stringify(theirIncoming));
    renderAll();
    showProfileToast("Request cancelled.");
  }

  function acceptRequest(from) {
    const incoming = getIncoming().filter((u) => u !== from);
    saveIncoming(incoming);
    // Remove from their sent
    const theirSentKey = `flixrate_friends_sent_${from}`;
    const theirSent = JSON.parse(
      localStorage.getItem(theirSentKey) || "[]",
    ).filter((u) => u !== Auth.getSession()?.username);
    localStorage.setItem(theirSentKey, JSON.stringify(theirSent));
    // Add to both friend lists
    const myFriends = getFriends();
    if (!myFriends.includes(from)) {
      myFriends.push(from);
      saveFriends(myFriends);
    }
    const theirFriendsKey = `flixrate_friends_list_${from}`;
    const theirFriends = JSON.parse(
      localStorage.getItem(theirFriendsKey) || "[]",
    );
    if (!theirFriends.includes(Auth.getSession()?.username)) {
      theirFriends.push(Auth.getSession().username);
      localStorage.setItem(theirFriendsKey, JSON.stringify(theirFriends));
    }
    renderAll();
    showProfileToast(`You and @${from} are now friends! 🎉`);
  }

  function declineRequest(from) {
    saveIncoming(getIncoming().filter((u) => u !== from));
    // Remove from their sent
    const theirSentKey = `flixrate_friends_sent_${from}`;
    const theirSent = JSON.parse(
      localStorage.getItem(theirSentKey) || "[]",
    ).filter((u) => u !== Auth.getSession()?.username);
    localStorage.setItem(theirSentKey, JSON.stringify(theirSent));
    renderAll();
    showProfileToast("Request declined.");
  }

  function removeFriend(username) {
    if (!confirm(`Remove @${username} from your friends?`)) return;
    saveFriends(getFriends().filter((u) => u !== username));
    // Remove from their list too
    const theirKey = `flixrate_friends_list_${username}`;
    const theirs = JSON.parse(localStorage.getItem(theirKey) || "[]").filter(
      (u) => u !== Auth.getSession()?.username,
    );
    localStorage.setItem(theirKey, JSON.stringify(theirs));
    renderAll();
    showProfileToast(`@${username} removed from friends.`);
  }

  // ── Toast proxy (uses profile toast) ─────────────────────
  function showProfileToast(msg) {
    const t = document.getElementById("profile-toast");
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(10px)";
    }, 2500);
  }

  // ── Render a single user row ──────────────────────────────
  function renderFriendCard(username, mode) {
    // mode: 'friend' | 'incoming' | 'search'
    const status = getStatus(username);
    let actionHtml = "";

    if (mode === "incoming") {
      actionHtml = `
        <div class="friend-request-btns">
          <button class="friend-btn-accept" onclick="Friends.accept('${esc(username)}')">✓ Accept</button>
          <button class="friend-btn-decline" onclick="Friends.decline('${esc(username)}')">✕</button>
        </div>`;
    } else if (mode === "friend") {
      actionHtml = `<button class="friend-action-btn friend-btn-friends" onclick="Friends.remove('${esc(username)}')" title="Remove friend">✓ Friends</button>`;
    } else {
      // search mode — show appropriate button for status
      if (status === "friends") {
        actionHtml = `<button class="friend-action-btn friend-btn-friends" onclick="Friends.remove('${esc(username)}')" title="Remove friend">✓ Friends</button>`;
      } else if (status === "pending") {
        actionHtml = `<button class="friend-action-btn friend-btn-pending" onclick="Friends.cancel('${esc(username)}')">Pending ✕</button>`;
      } else if (status === "incoming") {
        actionHtml = `
          <div class="friend-request-btns">
            <button class="friend-btn-accept" onclick="Friends.accept('${esc(username)}')">✓</button>
            <button class="friend-btn-decline" onclick="Friends.decline('${esc(username)}')">✕</button>
          </div>`;
      } else {
        actionHtml = `<button class="friend-action-btn friend-btn-add" onclick="Friends.send('${esc(username)}')">+ Add</button>`;
      }
    }

    return `
      <div class="friend-card">
        <div class="friend-avatar" style="background:${avatarColor(username)}">
          ${avatarLetter(username)}
          <span class="friend-online-dot dot-offline"></span>
        </div>
        <div class="friend-info">
          <div class="friend-name">${esc(username)}</div>
          <div class="friend-meta">${mode === "friend" ? "👥 Friend" : mode === "incoming" ? "📩 Sent you a request" : "🔍 FlixRate user"}</div>
        </div>
        ${actionHtml}
      </div>`;
  }

  // ── Active tab ────────────────────────────────────────────
  let activeTab = "friends";
  let searchQuery = "";

  function renderAll() {
    renderBadge();
    if (activeTab === "friends") renderFriendsList();
    if (activeTab === "requests") renderRequests();
    if (activeTab === "find") renderFind(searchQuery);
  }

  function renderBadge() {
    const count = getIncoming().length;
    const badge = document.getElementById("friends-badge");
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count ? "flex" : "none";
    // Update requests tab badge
    const reqBadge = document.getElementById("friends-tab-req-badge");
    if (reqBadge) {
      reqBadge.textContent = count;
      reqBadge.style.display = count ? "inline-flex" : "none";
    }
  }

  function renderFriendsList() {
    const body = document.getElementById("friends-drawer-body");
    if (!body) return;
    const friends = getFriends();
    if (!friends.length) {
      body.innerHTML = `<div class="friends-empty"><div class="friends-empty-icon">👥</div>No friends yet.<br>Use Find Friends to connect!</div>`;
      return;
    }
    body.innerHTML =
      `<div class="friends-section-label">Your Friends · ${friends.length}</div>` +
      friends
        .map((u) => renderFriendCard(u, "friend"))
        .join('<div class="friends-divider"></div>');
  }

  function renderRequests() {
    const body = document.getElementById("friends-drawer-body");
    if (!body) return;
    const incoming = getIncoming();
    const sent = getSentReqs();
    let html = "";
    if (incoming.length) {
      html += `<div class="friends-section-label">Received Requests · ${incoming.length}</div>`;
      html += incoming
        .map((u) => renderFriendCard(u, "incoming"))
        .join('<div class="friends-divider"></div>');
    }
    if (sent.length) {
      html += `<div class="friends-section-label" style="margin-top:12px">Sent Requests · ${sent.length}</div>`;
      html += sent
        .map(
          (u) => `
        <div class="friend-card">
          <div class="friend-avatar" style="background:${avatarColor(u)}">${avatarLetter(u)}</div>
          <div class="friend-info">
            <div class="friend-name">${esc(u)}</div>
            <div class="friend-meta">📤 Awaiting response</div>
          </div>
          <button class="friend-action-btn friend-btn-pending" onclick="Friends.cancel('${esc(u)}')">Pending ✕</button>
        </div>`,
        )
        .join('<div class="friends-divider"></div>');
    }
    if (!incoming.length && !sent.length) {
      html = `<div class="friends-empty"><div class="friends-empty-icon">📩</div>No pending requests.</div>`;
    }
    body.innerHTML = html;
  }

  function renderFind(query) {
    const body = document.getElementById("friends-drawer-body");
    if (!body) return;
    const users = findUsers(query);
    if (!users.length) {
      body.innerHTML = query
        ? `<div class="friends-empty"><div class="friends-empty-icon">🔍</div>No users found for "${esc(query)}".</div>`
        : `<div class="friends-empty"><div class="friends-empty-icon">👤</div>No other users registered yet.<br>Invite a friend to join FlixRate!</div>`;
      return;
    }
    body.innerHTML =
      `<div class="friends-section-label">People on FlixRate · ${users.length}</div>` +
      users
        .map((u) => renderFriendCard(u, "search"))
        .join('<div class="friends-divider"></div>');
  }

  // ── Drawer open / close ───────────────────────────────────
  function open() {
    document.getElementById("friends-drawer")?.classList.add("open");
    document.getElementById("friends-backdrop")?.classList.add("open");
    document.body.style.overflow = "hidden";
    switchTab("friends");
  }
  function close() {
    document.getElementById("friends-drawer")?.classList.remove("open");
    document.getElementById("friends-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ── Tab switch ────────────────────────────────────────────
  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll(".friends-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.ftab === tabId);
    });
    const searchWrap = document.getElementById("friends-search-wrap");
    if (searchWrap)
      searchWrap.style.display = tabId === "find" ? "block" : "none";
    renderAll();
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    renderBadge();
    // Friends button
    document.getElementById("btn-friends")?.addEventListener("click", open);
    document
      .getElementById("friends-head-close")
      ?.addEventListener("click", close);
    document
      .getElementById("friends-backdrop")
      ?.addEventListener("click", close);
    // Tabs
    document.querySelectorAll(".friends-tab").forEach((t) => {
      t.addEventListener("click", () => switchTab(t.dataset.ftab));
    });
    // Search input
    const searchInput = document.getElementById("friends-search-input");
    let debounce = null;
    searchInput?.addEventListener("input", () => {
      clearTimeout(debounce);
      searchQuery = searchInput.value.trim();
      debounce = setTimeout(() => renderFind(searchQuery), 300);
    });
  }

  return {
    init,
    open,
    close,
    send: sendRequest,
    cancel: cancelRequest,
    accept: acceptRequest,
    decline: declineRequest,
    remove: removeFriend,
  };
})();

if (typeof API !== "undefined") {
  API.tmdbRaw = async function (endpoint, params = {}) {
    const url = new URL(`${CONFIG.TMDB_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${CONFIG.TMDB_BEARER}`,
        accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`TMDB ${endpoint} ${res.status}`);
    return res.json();
  };
  API.jikanRaw = async function (endpoint) {
    const res = await fetch(`${CONFIG.JIKAN_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`Jikan ${endpoint} ${res.status}`);
    return res.json();
  };
}

document.addEventListener("DOMContentLoaded", Profile.init);
