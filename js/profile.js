// ============================================================
// FlixRate – Profile Module (FIREBASE VERSION)
// ============================================================

import { auth, db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// 🟨 Global state attached to window so friends.js can share it
window.cloudProfile = {
  username: "",
  displayName: "",
  bio: "",
  joinDate: Date.now(),
  avatar: null,
  highlights: [null, null, null, null, null],
  friends: [],
  sentReqs: [],
  incomingReqs: [],
  watchlist: {},
};

window.saveCloudProfile = async function () {
  const session = window.Auth ? window.Auth.getSession() : null;
  if (session) {
    try {
      await setDoc(
        doc(db, "users", session.id.toString()),
        window.cloudProfile,
        { merge: true },
      );
      if (window.cloudProfile.avatar) {
        localStorage.setItem(
          "flixrate_profile_avatar",
          window.cloudProfile.avatar,
        );
      } else {
        localStorage.removeItem("flixrate_profile_avatar");
      }
    } catch (e) {
      console.error("Failed to save profile to cloud:", e);
    }
  }
};

const Profile = (() => {
  const MAX_HIGHLIGHTS = 5;
  let pickerSlotIndex = null;
  let pickerSearch = null;
  let pickerType = "movie";
  let userForumPosts = [];

  // 🟨 State to determine if we are viewing our own profile or someone else's
  let isOwnProfile = true;
  let viewedUsername = "";
  let targetProfile = null;

  function getSettings() {
    const prof = isOwnProfile ? window.cloudProfile : targetProfile || {};
    return {
      displayName: prof.displayName || viewedUsername,
      bio: prof.bio,
      joinDate: prof.joinDate || Date.now(),
    };
  }

  function saveSettings(obj) {
    window.cloudProfile.displayName = obj.displayName;
    window.cloudProfile.bio = obj.bio;
    window.saveCloudProfile();
  }

  function getAvatar() {
    return isOwnProfile
      ? window.cloudProfile.avatar
      : targetProfile?.avatar || null;
  }
  function saveAvatar(data) {
    window.cloudProfile.avatar = data;
    window.saveCloudProfile();
  }
  function removeAvatar() {
    window.cloudProfile.avatar = null;
    window.saveCloudProfile();
  }

  function getHighlights() {
    const prof = isOwnProfile ? window.cloudProfile : targetProfile || {};
    return prof.highlights || new Array(5).fill(null);
  }
  function saveHighlights(arr) {
    window.cloudProfile.highlights = arr;
    window.saveCloudProfile();
  }

  function getUserRatings() {
    // If viewing someone else, try to pull from their cloud profile
    if (!isOwnProfile) return targetProfile?.ratings || {};

    const session = window.Auth.getSession();
    if (!session) return {};
    const key = `flixrate_ratings_${session.username}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  function getWishlist() {
    const prof = isOwnProfile ? window.cloudProfile : targetProfile || {};
    const wl = prof.watchlist || {};
    return Object.values(wl).sort(
      (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
    );
  }

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

  function renderHeader() {
    const settings = getSettings();
    const avatar = getAvatar();
    const ratings = getUserRatings();
    const wishlist = getWishlist();
    const badge = memberBadge(settings.joinDate);

    const displayName = settings.displayName || viewedUsername;

    // 1. Update the Main Profile Avatar
    const avatarEl = document.getElementById("profile-avatar-display");
    if (avatarEl) {
      if (avatar) {
        avatarEl.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        avatarEl.style.background = "none";
        avatarEl.style.padding = "0"; // Crucial: removes space around the image
      } else {
        avatarEl.innerHTML = avatarLetter(viewedUsername);
        avatarEl.style.background = avatarColor(viewedUsername);
      }
    }

    // 2. Update the Edit Profile Settings Avatar
    const settingsAvEl = document.getElementById("settings-avatar-preview");
    if (settingsAvEl) {
      if (avatar) {
        settingsAvEl.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        settingsAvEl.style.background = "none";
        settingsAvEl.style.padding = "0";
      } else {
        settingsAvEl.innerHTML = avatarLetter(viewedUsername);
        settingsAvEl.style.background = avatarColor(viewedUsername);
      }
    }

    const nameEl = document.getElementById("profile-display-name");
    if (nameEl) nameEl.textContent = displayName;
    const usernameEl = document.getElementById("profile-username");
    if (usernameEl) usernameEl.textContent = `@${viewedUsername}`;
    const badgeEl = document.getElementById("profile-badge");
    if (badgeEl) {
      badgeEl.textContent = badge.label;
      badgeEl.className = `profile-badge ${badge.cls}`;
    }

    const bioEl = document.getElementById("profile-bio");
    if (bioEl) {
      if (settings.bio) {
        bioEl.innerHTML = `<span>${esc(settings.bio)}</span>`;
      } else {
        bioEl.innerHTML = `<span class="profile-bio-placeholder">${isOwnProfile ? "No bio yet — edit your profile to add one." : "This user hasn't written a bio yet."}</span>`;
      }
    }

    document.getElementById("stat-ratings") &&
      (document.getElementById("stat-ratings").textContent =
        Object.keys(ratings).length);
    document.getElementById("stat-wishlist") &&
      (document.getElementById("stat-wishlist").textContent = wishlist.length);
    document.getElementById("stat-posts") &&
      (document.getElementById("stat-posts").textContent =
        userForumPosts.length);

    document.getElementById("stat-followers") &&
      (document.getElementById("stat-followers").textContent = (
        window.cloudProfile.followers || []
      ).length);
    document.getElementById("stat-following") &&
      (document.getElementById("stat-following").textContent = (
        window.cloudProfile.following || []
      ).length);

    // 🟨 UI Updates for Read-Only Mode
    if (!isOwnProfile) {
      document.querySelector(".avatar-edit-overlay")?.remove();
      document.getElementById("btn-edit-profile")?.remove();
      document.getElementById("btn-friends")?.remove();
      document.getElementById("profile-avatar-container").style.cursor =
        "default";

      // Check auth to see if we can follow
      const mySession = window.Auth.getSession();
      if (mySession && typeof window.Friends !== "undefined") {
        const btnFollow = document.getElementById("btn-interact-profile");
        const btnText = document.getElementById("btn-interact-text");
        if (btnFollow) {
          btnFollow.style.display = "flex";
          // Get my own user doc to see if I follow this person
          getDoc(doc(db, "users", mySession.id.toString())).then((snap) => {
            if (snap.exists()) {
              const myData = snap.data();
              const iFollow = (myData.following || []).includes(viewedUsername);
              if (iFollow) {
                btnFollow.classList.add("following");
                btnText.textContent = "Unfollow";
              } else {
                btnFollow.classList.remove("following");
                btnText.textContent = "Follow";
              }
            }
          });
          btnFollow.onclick = () => {
            if (btnFollow.classList.contains("following")) {
              window.Friends.unfollow(viewedUsername).then(() => {
                btnFollow.classList.remove("following");
                btnText.textContent = "Follow";
              });
            } else {
              window.Friends.follow(viewedUsername).then(() => {
                btnFollow.classList.add("following");
                btnText.textContent = "Unfollow";
              });
            }
          };
        }
      }

      const title = document.querySelector(".profile-card-title");
      if (title)
        title.innerHTML = title.innerHTML.replace(
          "My Top 5 Highlights",
          `${esc(displayName)}'s Highlights`,
        );
    } else {
      const settingsUser = document.getElementById("settings-username");
      const settingsName = document.getElementById("settings-display-name");
      const settingsBio = document.getElementById("settings-bio");
      if (settingsUser) settingsUser.value = window.cloudProfile.username || "";
      if (settingsName) settingsName.value = settings.displayName || "";
      if (settingsBio) settingsBio.value = settings.bio || "";
    }
  }

  function renderHighlights() {
    const highlights = getHighlights();
    const grid = document.getElementById("highlights-grid");
    if (!grid) return;

    grid.innerHTML = highlights
      .map((item, i) => {
        if (!item) {
          if (!isOwnProfile)
            return `<div class="highlight-slot empty" style="cursor:default"><span class="highlight-add-text">Empty Slot</span></div>`;
          return `
          <div class="highlight-slot empty" onclick="window.Profile.openPicker(${i})">
            <span class="highlight-add-icon">＋</span>
            <span class="highlight-add-text">Add #${i + 1}</span>
          </div>`;
        }

        const poster = item.poster
          ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" class="highlight-poster" loading="lazy">`
          : `<div class="highlight-poster" style="background:${avatarColor(item.title || "?")};display:flex;align-items:center;justify-content:center;font-size:2rem">🎬</div>`;

        return `
        <div class="highlight-slot filled" 
             title="${esc(item.title)}"
             data-ctx-id="${item.id}"
             data-ctx-type="${item.type}"
             data-ctx-title="${esc(item.title)}"
             data-ctx-poster="${esc(item.poster || "")}"
             data-ctx-year="${item.year || ""}"
             data-ctx-rating="${item.rating || ""}">
          <span class="highlight-rank">${i + 1}</span>
          ${poster}
          ${isOwnProfile ? `<button class="highlight-remove" onclick="event.stopPropagation();window.Profile.removeHighlight(${i})" aria-label="Remove">✕</button>` : ""}
          <div class="highlight-overlay" onclick="window.Profile.goToDetail('${esc(item.type)}','${item.id}')">
            <div class="highlight-title">${esc(item.title)}</div>
            <span class="highlight-type-badge">${item.type === "anime" ? "🎌" : item.type === "tv" ? "📺" : "🎬"} ${item.type}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  function removeHighlight(index) {
    if (!isOwnProfile) return;
    const h = getHighlights();
    h[index] = null;
    saveHighlights(h);
    renderHighlights();
    showToast("Removed from highlights");
  }

  function openPicker(slotIndex) {
    if (!isOwnProfile) return;
    pickerSlotIndex = slotIndex;
    pickerType = "movie";

    const modal = document.getElementById("picker-modal-backdrop");
    modal?.classList.add("open");
    document.body.style.overflow = "hidden";

    const searchInput = document.getElementById("picker-search-input");
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    document.querySelectorAll(".picker-type-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === "movie");
    });
    searchPicker("");
  }

  function closePicker() {
    document.getElementById("picker-modal-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
    pickerSlotIndex = null;
  }

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

        if (typeof window.API !== "undefined" && window.API.tmdbRaw) {
          const data = await window.API.tmdbRaw(endpoint, params);
          items = (data.results || []).slice(0, 15).map((m) => ({
            id: m.id,
            type: pickerType,
            title: m.title || m.name,
            poster: m.poster_path
              ? window.CONFIG.TMDB_IMG_W500 + m.poster_path
              : null,
            year: (m.release_date || m.first_air_date || "").slice(0, 4),
            score: m.vote_average ? m.vote_average.toFixed(1) : "—",
          }));
        }
      } else {
        const endpoint = query
          ? `/anime?q=${encodeURIComponent(query)}&limit=15`
          : `/top/anime?limit=15`;
        if (typeof window.API !== "undefined" && window.API.jikanRaw) {
          const data = await window.API.jikanRaw(endpoint);
          items = (data.data || []).map((a) => ({
            id: a.mal_id,
            type: "anime",
            title: a.title_english || a.title,
            poster: a.images?.jpg?.image_url || null,
            year: a.year || "",
            score: a.score ? a.score.toFixed(1) : "—",
          }));
        }
      }

      if (!items.length) {
        resultsEl.innerHTML = `<div class="picker-empty">No results found. Try a different search.</div>`;
        return;
      }

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

      resultsEl.onclick = (e) => {
        const row = e.target.closest(".picker-result-item");
        if (!row) return;
        try {
          const item = JSON.parse(
            decodeURIComponent(escape(atob(row.dataset.item))),
          );
          selectItemObj(item);
        } catch (err) {
          console.error("Highlight parse error:", err);
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
  function selectItem(jsonStr) {
    selectItemObj(typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr);
  }

  function renderActivity() {
    const el = document.getElementById("activity-list");
    if (!el) return;
    const activities = [];

    userForumPosts.slice(0, 5).forEach((p) => {
      activities.push({
        icon: "💬",
        color: "rgba(124,58,237,0.15)",
        text: `Posted <strong>${esc(p.title || p.text?.slice(0, 40) || "a post")}</strong> in the forum`,
        ts: p.ts,
      });
    });

    Object.entries(getUserRatings())
      .slice(0, 5)
      .forEach(([key, valObj]) => {
        const [type] = key.split("_");
        activities.push({
          icon: "⭐",
          color: "rgba(251,191,36,0.12)",
          text: `Rated <strong>${esc(valObj.title) || type}</strong> <strong>${valObj.val}/5</strong>`,
          ts: valObj.ts || Date.now(),
        });
      });

    getWishlist()
      .slice(0, 3)
      .forEach((w) => {
        activities.push({
          icon: "🔖",
          color: "rgba(34,197,94,0.12)",
          text: `Added <strong>${esc(w.title || "an item")}</strong> to watchlist`,
          ts: w.addedAt || Date.now(),
        });
      });

    activities.sort((a, b) => b.ts - a.ts);

    if (!activities.length) {
      el.innerHTML = `<div class="activity-empty">${isOwnProfile ? "No activity yet. Start rating, posting, and saving content!" : "This user has no recent activity."}</div>`;
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

  function renderWatchlistMini() {
    const el = document.getElementById("watchlist-mini-list");
    if (!el) return;
    const list = getWishlist().slice(0, 5);
    if (!list.length) {
      el.innerHTML = `<div class="watchlist-empty">${isOwnProfile ? "Your watchlist is empty." : "This user hasn't saved anything."}</div>`;
      return;
    }
    el.innerHTML = list
      .map(
        (w) => `
      <div class="watchlist-mini-item" onclick="window.Profile.goToDetail('${esc(w.type || "movie")}','${w.id}')">
        ${w.poster ? `<img src="${esc(w.poster)}" class="watchlist-mini-poster" alt="${esc(w.title)}">` : `<div class="watchlist-mini-poster" style="background:${avatarColor(w.title || "?")};border-radius:5px"></div>`}
        <div class="watchlist-mini-title">${esc(w.title)}</div>
      </div>`,
      )
      .join("");
  }

  function renderGenreTags() {
    const el = document.getElementById("genre-tags");
    if (!el) return;
    el.innerHTML =
      '<span style="font-size:0.8rem;color:var(--text-muted)">Genres coming soon!</span>';
  }

  function renderRatedTab() {
    const el = document.getElementById("tab-rated-grid");
    if (!el) return;
    const ratings = getUserRatings();
    const entries = Object.entries(ratings);
    if (!entries.length) {
      el.innerHTML = `<div class="tab-empty">${isOwnProfile ? "You haven't rated anything yet. Rate movies and anime from the detail page!" : "This user hasn't rated anything yet."}</div>`;
      return;
    }
    el.innerHTML =
      `<div class="rated-grid">` +
      entries
        .slice(0, 20)
        .map(([key, scoreObj]) => {
          const [type, ...idParts] = key.split("_");
          const id = idParts.join("_");
          const titleText = scoreObj.title
            ? esc(scoreObj.title)
            : `${esc(type)} · ${id.slice(0, 6)}`;
          const posterHtml = scoreObj.poster
            ? `<img src="${esc(scoreObj.poster)}" alt="${titleText}" style="width:100%;height:100%;object-fit:cover;">`
            : type === "anime"
              ? "🎌"
              : type === "tv"
                ? "📺"
                : "🎬";
          return `
          <div class="rated-card" onclick="window.Profile.goToDetail('${esc(type)}','${id}')">
            <div class="rated-card-poster" style="background:${avatarColor(key)};display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;">
              ${posterHtml}
            </div>
            <div class="rated-card-body">
              <div class="rated-card-title">${titleText}</div>
              <div class="rated-card-score">★ ${scoreObj.val}/5</div>
            </div>
          </div>`;
        })
        .join("") +
      `</div>`;
  }

  function switchTab(tabId) {
    document
      .querySelectorAll(".profile-tab")
      .forEach((t) => t.classList.toggle("active", t.dataset.tab === tabId));
    document
      .querySelectorAll(".tab-panel")
      .forEach(
        (p) => (p.style.display = p.id === `panel-${tabId}` ? "block" : "none"),
      );
    if (tabId === "rated") renderRatedTab();
    if (tabId === "activity") renderActivity();
  }

  function handleAvatarUpload(file) {
    if (!file?.type.startsWith("image/")) {
      showToast("Select an image file.");
      return;
    }
    if (file.size > 700 * 1024) {
      showToast("Image must be under 700KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      saveAvatar(e.target.result);
      renderHeader();
      if (typeof window.Auth !== "undefined" && window.Auth.updateNavbar)
        window.Auth.updateNavbar();
      showToast("Profile picture updated! 🎉");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    removeAvatar();
    renderHeader();
    if (typeof window.Auth !== "undefined" && window.Auth.updateNavbar)
      window.Auth.updateNavbar();
    showToast("Profile picture removed.");
  }

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
  async function saveSettingsForm() {
    const errEl = document.getElementById("settings-username-err");
    if (errEl) {
      errEl.textContent = "";
      errEl.style.display = "none";
    }

    const newUsername =
      document.getElementById("settings-username")?.value.trim() || "";
    const displayName =
      document.getElementById("settings-display-name")?.value.trim() || "";
    const bio = document.getElementById("settings-bio")?.value.trim() || "";

    if (!newUsername) {
      if (errEl) {
        errEl.textContent = "Username cannot be empty";
        errEl.style.display = "block";
      }
      return;
    }

    const currentUsername = window.cloudProfile.username;
    let usernameChanged = false;

    if (newUsername !== currentUsername) {
      const unameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!unameRegex.test(newUsername)) {
        if (errEl) {
          errEl.textContent =
            "Username must be 3-20 characters long and can only contain letters, numbers, and underscores.";
          errEl.style.display = "block";
        }
        return;
      }
      try {
        const q = query(
          collection(db, "users"),
          where("username", "==", newUsername),
        );
        const qs = await getDocs(q);
        if (!qs.empty) {
          if (errEl) {
            errEl.textContent = "Username is already taken.";
            errEl.style.display = "block";
          }
          return;
        }
        usernameChanged = true;
      } catch (e) {
        console.error("Failed to check username:", e);
        if (errEl) {
          errEl.textContent = "Error communicating with server.";
          errEl.style.display = "block";
        }
        return;
      }
    }

    if (usernameChanged) {
      window.cloudProfile.username = newUsername;
      window.Auth.updateSession({ username: newUsername });
      viewedUsername = newUsername;
    }

    saveSettings({ displayName, bio });
    closeSettings();
    renderAll();
    showToast("Profile saved! ✅");
  }

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

  function renderAll() {
    renderHeader();
    renderHighlights();
    renderActivity();
    renderWatchlistMini();
    renderGenreTags();
  }

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

  async function fetchCloudData(session) {
    try {
      if (session) {
        // ALWAYS load the active user's own profile into window.cloudProfile for network actions!
        const userRef = doc(db, "users", session.id.toString());
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          window.cloudProfile = { ...window.cloudProfile, ...data };
          if (data.username && data.username !== session.username) {
            window.Auth.updateSession({ username: data.username });
            if (isOwnProfile) {
              viewedUsername = data.username;
            }
          }
        } else {
          window.cloudProfile.username = session.username;
          window.cloudProfile.displayName = session.username;
          window.cloudProfile.joinDate = Date.now();
          await setDoc(userRef, window.cloudProfile);
        }
      }

      if (!isOwnProfile) {
        // Fetch public profile using username into targetProfile
        const q = query(
          collection(db, "users"),
          where("username", "==", viewedUsername),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetProfile = snap.docs[0].data();
        } else {
          const main = document.getElementById("profile-main");
          if (main)
            main.innerHTML = `<div style="text-align:center;padding:100px;color:white;"><h2>User not found 🕵️‍♂️</h2><p>The profile @${esc(viewedUsername)} does not exist.</p><br><a href="profile.html" style="color:var(--accent-light)">View your profile</a></div>`;
          throw new Error("User not found");
        }
      }

      // Fetch user's forum posts
      const postQ = query(
        collection(db, "forum_posts"),
        where("author", "==", viewedUsername),
      );
      const postSnap = await getDocs(postQ);
      userForumPosts = postSnap.docs.map((d) => d.data());
    } catch (e) {
      console.error("Failed to fetch cloud profile data:", e);
      throw e; // Stop initialization
    }
  }

  async function init() {
    if (window.Auth && typeof window.Auth.init === "function")
      window.Auth.init();
    const session = window.Auth.getSession();

    // 🟨 Check URL for ?u=username
    const urlParams = new URLSearchParams(window.location.search);
    const targetUser = urlParams.get("u");

    if (targetUser && (!session || targetUser !== session.username)) {
      isOwnProfile = false;
      viewedUsername = targetUser;
    } else {
      if (!session) {
        showAuthGate();
        return;
      }
      isOwnProfile = true;
      viewedUsername = session.username;
    }

    try {
      await fetchCloudData(session);
    } catch (e) {
      return;
    } // Stop if user not found

    renderAll();

    if (
      isOwnProfile &&
      window.Friends &&
      typeof window.Friends.init === "function"
    )
      window.Friends.init();

    // 🟨 Update Share Button to generate the public URL
    document
      .getElementById("btn-share-profile")
      ?.addEventListener("click", () => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(window.cloudProfile.username)}`;
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
        showToast("Public profile link copied!");
      });

    // Only attach edit listeners if it's our own profile
    if (isOwnProfile) {
      const avatarInput = document.getElementById("avatar-file-input");
      document
        .getElementById("profile-avatar-container")
        ?.addEventListener("click", () => avatarInput?.click());
      document
        .getElementById("btn-upload-avatar")
        ?.addEventListener("click", () => avatarInput?.click());
      avatarInput?.addEventListener("change", (e) =>
        handleAvatarUpload(e.target.files[0]),
      );
      document
        .getElementById("btn-remove-avatar")
        ?.addEventListener("click", handleRemoveAvatar);

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

      document
        .getElementById("picker-modal-backdrop")
        ?.addEventListener("click", (e) => {
          if (e.target.id === "picker-modal-backdrop") closePicker();
        });
      document
        .getElementById("picker-close")
        ?.addEventListener("click", closePicker);

      const pickerSearchInput = document.getElementById("picker-search-input");
      pickerSearchInput?.addEventListener("input", () => {
        clearTimeout(pickerSearch);
        pickerSearch = setTimeout(
          () => searchPicker(pickerSearchInput.value.trim()),
          400,
        );
      });
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
    }

    document.querySelectorAll(".profile-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePicker();
        closeSettings();
        if (window.Friends) window.Friends.close();
      }
    });
  }

  function goToDetail(type, id) {
    if (!type || !id) return;
    window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  }

  return {
    init,
    openPicker,
    closePicker,
    selectItem,
    removeHighlight,
    goToDetail,
    switchTab,
  };
})();

window.Profile = Profile;

if (typeof window.API !== "undefined") {
  window.API.tmdbRaw = async function (endpoint, params = {}) {
    const url = new URL(`${window.CONFIG.TMDB_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${window.CONFIG.TMDB_BEARER}`,
        accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`TMDB ${endpoint} ${res.status}`);
    return res.json();
  };
  window.API.jikanRaw = async function (endpoint) {
    const res = await fetch(`${window.CONFIG.JIKAN_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`Jikan ${endpoint} ${res.status}`);
    return res.json();
  };
}

document.addEventListener("DOMContentLoaded", window.Profile.init);
