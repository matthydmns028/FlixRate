// ============================================================
// FlixRate – Watchlist Page Module (FIREBASE VERSION)
// ============================================================

import { auth, db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const Watchlist = (() => {
  let filter = "all"; // all | movie | tv | anime
  let sort = "newest"; // newest | oldest | rating | title
  let cloudWatchlist = {}; // Store raw cloud object

  function esc(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // 🟨 Pull Watchlist directly from Firestore
  async function fetchCloudWatchlist() {
    const session = window.Auth.getSession();
    if (!session) return;

    try {
      const userRef = doc(db, "users", String(session.id));
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().watchlist) {
        cloudWatchlist = snap.data().watchlist;
      }
    } catch (e) {
      console.error("Failed to fetch cloud watchlist:", e);
    }
  }

  function getItems() {
    return Object.values(cloudWatchlist).filter(
      (v) => v && typeof v === "object",
    );
  }

  function applyFilter(items) {
    if (filter === "all") return items;
    return items.filter((i) => i.type === filter);
  }

  function applySort(items) {
    return [...items].sort((a, b) => {
      if (sort === "newest") return (b.addedAt || 0) - (a.addedAt || 0);
      if (sort === "oldest") return (a.addedAt || 0) - (b.addedAt || 0);
      if (sort === "rating")
        return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      if (sort === "title") return (a.title || "").localeCompare(b.title || "");
      return 0;
    });
  }

  // 🟨 Delete item from Firestore
  async function removeItem(key) {
    const session = window.Auth.getSession();
    if (!session) return;

    // Optimistic UI update
    delete cloudWatchlist[key];
    render();

    try {
      const userRef = doc(db, "users", String(session.id));
      await setDoc(userRef, { watchlist: cloudWatchlist }, { merge: true });
    } catch (e) {
      console.error("Failed to remove item from cloud", e);
    }
  }

  function render() {
    const raw = getItems();
    const items = applySort(applyFilter(raw));
    const grid = document.getElementById("watchlist-grid");
    const countEl = document.getElementById("wl-count");
    if (!grid) return;

    if (countEl) countEl.textContent = `${raw.length} saved`;

    ["all", "movie", "tv", "anime"].forEach((f) => {
      const btn = document.querySelector(`.wl-filter-btn[data-filter="${f}"]`);
      if (!btn) return;
      const c =
        f === "all" ? raw.length : raw.filter((i) => i.type === f).length;
      btn.querySelector(".wl-filter-count").textContent = c;
    });

    if (!items.length) {
      grid.innerHTML = `
        <div class="watchlist-empty" style="grid-column:1/-1">
          <div class="watchlist-empty-icon">${filter === "all" ? "🔖" : filter === "anime" ? "🎌" : filter === "tv" ? "📺" : "🎬"}</div>
          <div class="watchlist-empty-title">${filter === "all" ? "Your watchlist is empty" : `No ${filter === "movie" ? "movies" : filter === "tv" ? "TV shows" : "anime"} saved yet`}</div>
          <div class="watchlist-empty-sub">Save titles from any detail page to revisit them later.</div>
          <a href="browse.html" class="wl-browse-btn">🔍 Browse Content</a>
        </div>`;
      return;
    }

    grid.innerHTML = items
      .map((item, idx) => {
        const key = `${item.type}_${item.id}`;
        const typeLabel =
          item.type === "anime"
            ? "🎌 Anime"
            : item.type === "tv"
              ? "📺 TV"
              : "🎬 Movie";
        const delay = Math.min(idx * 0.04, 0.6);

        let ratingStr = "";
        if (typeof window.API !== "undefined" && window.API.getLocalRating) {
          const lr = window.API.getLocalRating(item.type, item.id);
          ratingStr = lr.rating ? lr.rating.toFixed(1) : "";
        }

        return `
        <div class="wl-card" 
             data-ctx-id="${item.id}"
             data-ctx-type="${item.type}"
             data-ctx-title="${esc(item.title)}"
             data-ctx-poster="${esc(item.poster || "")}"
             data-ctx-year="${item.year || ""}"
             data-ctx-rating="${ratingStr || ""}"
             onclick="window.Watchlist.go('${esc(item.type)}','${item.id}')" style="animation-delay:${delay}s">
          <div class="wl-card-poster-wrap">
            ${item.poster ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" class="wl-card-poster" loading="lazy" referrerpolicy="no-referrer">` : `<div class="wl-card-poster-placeholder">${item.type === "anime" ? "🎌" : item.type === "tv" ? "📺" : "🎬"}</div>`}
            ${ratingStr ? `<div class="wl-card-score">★ ${ratingStr}</div>` : ""}
            <div class="wl-card-type-badge">${typeLabel}</div>
            <button class="wl-card-remove" onclick="event.stopPropagation();window.Watchlist.remove('${key}')">✕ Remove</button>
          </div>
          <div class="wl-card-body">
            <div class="wl-card-title">${esc(item.title)}</div>
            <div class="wl-card-meta">${item.year || ""}</div>
          </div>
        </div>`;
      })
      .join("");
  }

  function go(type, id) {
    window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  }

  function showAuthGate() {
    const main = document.querySelector(".watchlist-page");
    if (main) {
      main.innerHTML = `
      <div style="text-align:center; padding: 100px 20px; max-width: 400px; margin: 0 auto;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🔒</div>
        <h2 style="color: white; font-size: 1.5rem; margin-bottom: 10px;">Sign in to view Watchlist</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 30px;">Log in to save movies and anime across all your devices.</p>
        <a href="login.html" style="display:inline-block;padding:13px 32px;border-radius:50px;
          background:linear-gradient(135deg,var(--accent),var(--accent-light));
          color:white;font-weight:700;text-decoration:none;font-size:0.95rem;
          box-shadow:0 4px 16px rgba(124,58,237,0.35);transition:opacity 0.18s">
          Sign In
        </a>
      </div>`;
    }
  }

  async function init() {
    if (window.Auth && typeof window.Auth.init === "function")
      window.Auth.init();

    const session = window.Auth.getSession();
    if (!session) {
      showAuthGate();
      return;
    }

    // Pull from cloud before rendering!
    await fetchCloudWatchlist();
    render();

    document.querySelectorAll(".wl-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        filter = btn.dataset.filter;
        document
          .querySelectorAll(".wl-filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        render();
      });
    });

    const sortSel = document.getElementById("wl-sort");
    sortSel?.addEventListener("change", () => {
      sort = sortSel.value;
      render();
    });
  }

  return { init, remove: removeItem, go };
})();

window.Watchlist = Watchlist;
document.addEventListener("DOMContentLoaded", Watchlist.init);
