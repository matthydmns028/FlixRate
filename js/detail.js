// ============================================================
// FlixRate – Detail Page Module (FIREBASE VERSION)
// ============================================================

import { auth, db } from './firebase-init.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const Detail = (() => {
  const params = new URLSearchParams(window.location.search);
  const TYPE = params.get("type") || "movie"; // movie | tv | anime
  const ID = params.get("id");
  const LIKES_KEY = "flixrate_likes";

  let currentItem = null;
  let userStarHover = 0;
  let userStarSel = 0;
  let trailerKey = null;
  let currentComments = []; // Stores the live cloud comments
  const COMMENT_MAX = 500;

  function itemKey() {
    return `${TYPE}_${ID}`;
  }

  // ── Local Like Storage (prevents spamming likes) ────────────
  function getLikes() {
    return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
  }
  function toggleLike(commentId) {
    const likes = getLikes();
    likes[commentId] = !likes[commentId];
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
    return likes[commentId];
  }

  // ── Fetch data depending on type ──────────────────────────
  async function fetchItem() {
    if (TYPE === "anime") {
      const data = await API.fetchAnimeById(ID);
      return data ? normalizeAnime(data) : null;
    } else {
      const endpoint = TYPE === "tv" ? `/tv/${ID}` : `/movie/${ID}`;
      const headers = {
        Authorization: `Bearer ${CONFIG.TMDB_BEARER}`,
        accept: "application/json",
      };
      const base = CONFIG.TMDB_BASE;
      const [detail, credits, videos] = await Promise.all([
        fetch(`${base}${endpoint}?language=en-US`, { headers }).then((r) => r.json()),
        fetch(`${base}${endpoint}/credits?language=en-US`, { headers }).then((r) => r.json()),
        fetch(`${base}${endpoint}/videos?language=en-US`, { headers }).then((r) => r.json()),
      ]);
      if (detail.success === false) throw new Error(detail.status_message || "Not found");
      return normalizeTMDB(detail, credits, videos, TYPE);
    }
  }

  function normalizeTMDB(d, credits, videos, type) {
    const trailer = (videos.results || []).find((v) => v.type === "Trailer" && v.site === "YouTube");
    const cast = (credits.cast || []).slice(0, 8).map((c) => c.name).join(", ");
    const director = (credits.crew || []).find((c) => c.job === "Director");
    return {
      id: d.id,
      type,
      title: d.title || d.name,
      tagline: d.tagline || "",
      overview: d.overview || "",
      backdrop: d.backdrop_path ? CONFIG.TMDB_IMG_ORIGINAL + d.backdrop_path : null,
      poster: d.poster_path ? CONFIG.TMDB_IMG_W500 + d.poster_path : null,
      rating: API.getLocalRating(type, d.id).rating,
      votes: API.getLocalRating(type, d.id).votes,
      genres: (d.genres || []).map((g) => g.name),
      runtime: d.runtime || (d.episode_run_time ? d.episode_run_time[0] : null),
      year: (d.release_date || d.first_air_date || "").slice(0, 4),
      language: d.original_language?.toUpperCase(),
      status: d.status,
      cast,
      director: director?.name || "—",
      trailerKey: trailer?.key || null,
      homepage: d.homepage || null,
    };
  }

  function normalizeAnime(a) {
    return {
      id: a.mal_id,
      type: "anime",
      title: a.title_english || a.title,
      tagline: a.title_japanese || "",
      overview: a.synopsis || "",
      backdrop: a.images?.jpg?.large_image_url || null,
      poster: a.images?.jpg?.large_image_url || null,
      rating: API.getLocalRating("anime", a.mal_id).rating,
      votes: API.getLocalRating("anime", a.mal_id).votes,
      genres: (a.genres || []).map((g) => g.name),
      runtime: a.duration ? parseInt(a.duration) : null,
      year: a.year,
      language: "JP",
      status: a.status,
      cast: (a.producers || []).map((p) => p.name).slice(0, 4).join(", "),
      director: (a.studios || []).map((s) => s.name).slice(0, 2).join(", ") || "—",
      trailerKey: a.trailer?.youtube_id || null,
      homepage: a.url || null,
      episodes: a.episodes,
    };
  }

  // ── Render page ────────────────────────────────────────────
  async function render(item) {
    document.title = `${item.title} – FlixRate`;

    if (item.backdrop) {
      document.getElementById("detail-backdrop").style.backgroundImage = `url("${item.backdrop}")`;
    }
    const posterEl = document.getElementById("detail-poster");
    if (posterEl) {
      posterEl.src = item.poster || item.backdrop;
      posterEl.alt = item.title;
    }

    const badgesEl = document.getElementById("detail-badges");
    if (badgesEl) {
      const typeLabel = item.type === "anime" ? "🎌 Anime" : item.type === "tv" ? "📺 Series" : "🎬 Movie";
      const genreBadges = item.genres.slice(0, 4).map((g) => `<span class="detail-badge detail-badge--genre">${g}</span>`).join("");
      badgesEl.innerHTML = `<span class="detail-badge detail-badge--type">${typeLabel}</span>${genreBadges}`;
    }

    setEl("detail-title", item.title);
    setEl("detail-tagline", item.tagline);
    document.getElementById("detail-tagline").style.display = item.tagline ? "block" : "none";

    const meta = document.getElementById("detail-meta-row");
    if (meta) {
      meta.innerHTML = [
        item.year && `<span class="detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg><strong>${item.year}</strong></span>`,
        item.runtime && `<span class="detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><strong>${item.runtime} min</strong></span>`,
        item.episodes && `<span class="detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg><strong>${item.episodes} eps</strong></span>`,
        item.language && `<span class="detail-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><strong>${item.language}</strong></span>`,
        item.status && `<span class="detail-meta-item"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg><strong>${item.status}</strong></span>`,
      ].filter(Boolean).join("");
    }

    setEl("detail-overview", item.overview || "No overview available.");

    const infoList = document.getElementById("detail-info-list");
    if (infoList) {
      infoList.innerHTML = [
        ["Director / Studio", item.director],
        ["Cast", item.cast ? item.cast.slice(0, 80) + (item.cast.length > 80 ? "…" : "") : "—"],
        ["Status", item.status || "—"],
        ["Original Language", item.language || "—"],
        item.homepage ? ["Official Site", `<a href="${item.homepage}" target="_blank" rel="noopener" style="color:var(--accent-light)">Visit ↗</a>`] : null,
      ].filter(Boolean).map(([k, v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join("");
    }

    trailerKey = item.trailerKey;
    const trailerBtn = document.getElementById("detail-trailer-btn");
    if (trailerBtn) {
      if (trailerKey) {
        trailerBtn.onclick = () => loadTrailerEmbed(trailerKey);
      } else {
        trailerBtn.textContent = "🔍 Search Trailer";
        trailerBtn.onclick = () => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, "_blank");
      }
    }

    const embedArea = document.getElementById("trailer-embed-area");
    if (embedArea && trailerKey) {
      embedArea.innerHTML = `
        <div class="trailer-embed-container" id="trailer-embed-container">
          <div class="trailer-embed-placeholder" onclick="Detail.loadTrailer()">
            <div class="trailer-play-btn">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
            <span>Click to watch the trailer</span>
            <span style="font-size:0.75rem;color:var(--text-muted)">${item.title}</span>
          </div>
        </div>`;
    } else if (embedArea) {
      embedArea.innerHTML = `<div class="trailer-embed-container" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--text-muted)"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg><p style="font-size:0.85rem">No trailer available</p></div>`;
    }

    applyColor(item.poster || item.backdrop);
    await renderGlobalRating();
  }

  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  async function applyColor(imageUrl) {
    if (!imageUrl) return;
    try {
      const color = await ColorExtractor.getDominantColor(imageUrl);
      const root = document.documentElement;
      root.style.setProperty("--detail-r", color.r);
      root.style.setProperty("--detail-g", color.g);
      root.style.setProperty("--detail-b", color.b);

      const btn = document.getElementById("detail-trailer-btn");
      if (btn) {
        const light = ColorExtractor.lighten(color, 30);
        btn.style.background = `linear-gradient(135deg, ${color.css}, ${ColorExtractor.toRgbaString(light, 1)})`;
        btn.style.boxShadow = `0 0 28px ${ColorExtractor.toRgbaString(color, 0.5)}, 0 4px 15px ${ColorExtractor.toRgbaString(color, 0.3)}`;
      }
    } catch (e) { /* ignore */ }
  }

  // ── Firestore Ratings ────────────────────────────────────────────────
  
  async function renderGlobalRating() {
    const key = itemKey();
    let cloudRatings = { total: 0, count: 0, dist: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } };

    try {
      const docRef = doc(db, "global_ratings", key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        cloudRatings = docSnap.data();
      }
    } catch (error) {
      console.error("Could not fetch cloud ratings", error);
    }

    const r = API.getLocalRating(currentItem.type, currentItem.id);
    const apiScoreOutOf10 = r.rating ? parseFloat(r.rating) : 0;
    const apiVotes = r.votes || 0;

    const apiScoreOutOf5 = apiScoreOutOf10 / 2;
    const totalVotes = apiVotes + cloudRatings.count;
    let combined = 0;
    
    if (totalVotes > 0) {
      const apiTotalPoints = apiScoreOutOf5 * apiVotes;
      const cloudTotalPoints = cloudRatings.total; 
      combined = (apiTotalPoints + cloudTotalPoints) / totalVotes;
    }

    const scoreEl = document.getElementById("global-score-number");
    const starsEl = document.getElementById("global-stars");
    const voteEl = document.getElementById("global-vote-count");
    const pctEl = document.getElementById("global-score-pct");

    if (scoreEl) scoreEl.textContent = combined.toFixed(1);
    if (pctEl) pctEl.textContent = `/5`;
    if (voteEl) voteEl.textContent = `${formatNum(totalVotes)} votes`;
    if (starsEl) starsEl.innerHTML = starsHtml(combined);

    renderRatingBars(cloudRatings.dist);

    const session = window.Auth.getSession();
    if (session) {
      const userRatings = JSON.parse(localStorage.getItem(`flixrate_ratings_${session.username}`) || "{}");
      const userVoteObj = userRatings[key];
      const removeBtn = document.getElementById("vote-remove-btn");

      if (userVoteObj && userVoteObj.val) {
        userStarSel = userVoteObj.val;
        const stars = document.querySelectorAll(".star-pick-btn");
        stars.forEach((btn, i) => {
          btn.classList.toggle("selected", i + 1 <= userStarSel);
        });
        const thanks = document.getElementById("vote-thanks");
        if (thanks) {
          thanks.textContent = `You rated this ${userStarSel}/5 ★`;
          thanks.classList.add("visible");
        }
        const submitBtn = document.getElementById("vote-submit-btn");
        if (submitBtn) submitBtn.textContent = "Update Rating";
        if (removeBtn) removeBtn.style.display = "block";
      } else {
        if (removeBtn) removeBtn.style.display = "none";
      }
    }
  }

  function renderRatingBars(dist) {
    const bars = document.getElementById("rating-bars");
    if (!bars) return;
    const total = Object.values(dist).reduce((s, v) => s + v, 0);
    bars.innerHTML = [5, 4, 3, 2, 1].map((star) => {
        const count = dist[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div class="rating-bar-row">
        <span class="rating-bar-label">${star}</span>
        <div class="rating-bar-track">
          <div class="rating-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="rating-bar-pct">${count}</span>
      </div>`;
      }).join("");
  }

  function starsHtml(ratingVal) {
    const normalizedRating = Math.min(5, Math.max(0, ratingVal));
    const full = Math.floor(normalizedRating);
    const half = normalizedRating - full >= 0.4 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "⯨" : "") + "☆".repeat(empty);
  }

  function formatNum(n) {
    if (!n) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n;
  }

  function initStarPicker() {
    const stars = document.querySelectorAll(".star-pick-btn");
    stars.forEach((btn, i) => {
      const star = i + 1;
      btn.addEventListener("mouseenter", () => {
        userStarHover = star;
        updateStarDisplay(stars, star);
      });
      btn.addEventListener("mouseleave", () => {
        userStarHover = 0;
        updateStarDisplay(stars, userStarSel);
      });
      btn.addEventListener("click", () => {
        userStarSel = star;
        updateStarDisplay(stars, star);
      });
    });
  }

  function updateStarDisplay(stars, upTo) {
    stars.forEach((btn, i) => {
      const filled = i + 1 <= upTo;
      btn.classList.toggle("hovered", filled && !userStarSel);
      btn.classList.toggle("selected", filled && !!userStarSel);
    });
  }

  async function submitVote() {
    if (!userStarSel) return;
    const session = window.Auth.getSession();
    if (!session) {
      alert("Please sign in to vote!");
      window.location.href = "login.html";
      return;
    }

    const key = itemKey();
    const userKey = `flixrate_ratings_${session.username}`;
    const userRatings = JSON.parse(localStorage.getItem(userKey) || "{}");
    const prevVoteObj = userRatings[key];
    const prevVote = prevVoteObj ? prevVoteObj.val : 0;

    if (userStarSel === prevVote) {
      const thanks = document.getElementById("vote-thanks");
      if (thanks) {
        thanks.textContent = `You already rated this ${userStarSel}/5 ★`;
        thanks.classList.add("visible");
      }
      return; 
    }

    const btn = document.getElementById("vote-submit-btn");
    if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }

    try {
      const docRef = doc(db, "global_ratings", key);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          total: 0,
          count: 0,
          dist: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
        });
      }

      const updates = {
        total: increment(userStarSel - prevVote),
        count: increment(prevVote ? 0 : 1),
        [`dist.${userStarSel}`]: increment(1)
      };
      
      if (prevVote && prevVote !== userStarSel) {
        updates[`dist.${prevVote}`] = increment(-1);
      }

      await updateDoc(docRef, updates);

      userRatings[key] = {
        val: userStarSel,
        ts: Date.now(),
        title: currentItem.title,
        poster: currentItem.poster || currentItem.backdrop,
      };
      localStorage.setItem(userKey, JSON.stringify(userRatings));

      const thanks = document.getElementById("vote-thanks");
      if (thanks) {
        thanks.textContent = `You rated this ${userStarSel}/5 ★`;
        thanks.classList.add("visible");
      }
      
      if (btn) { btn.textContent = "Update Rating"; btn.disabled = false; }
      
      const removeBtn = document.getElementById("vote-remove-btn");
      if (removeBtn) removeBtn.style.display = "block";

      await renderGlobalRating();

    } catch (error) {
      console.error("Error saving rating:", error);
      alert("Failed to save rating to the cloud.");
      if (btn) { btn.textContent = "Submit Rating"; btn.disabled = false; }
    }
  }

  async function removeVote() {
    const session = window.Auth.getSession();
    if (!session) return;

    const key = itemKey();
    const userKey = `flixrate_ratings_${session.username}`;
    const userRatings = JSON.parse(localStorage.getItem(userKey) || "{}");
    const prevVoteObj = userRatings[key];

    if (!prevVoteObj) return;
    const prevVote = prevVoteObj.val;

    const removeBtn = document.getElementById("vote-remove-btn");
    if (removeBtn) { removeBtn.textContent = "Removing..."; removeBtn.disabled = true; }

    try {
      const docRef = doc(db, "global_ratings", key);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const updates = {
          total: increment(-prevVote),
          count: increment(-1),
          [`dist.${prevVote}`]: increment(-1)
        };
        await updateDoc(docRef, updates);
      }

      delete userRatings[key];
      localStorage.setItem(userKey, JSON.stringify(userRatings));

      userStarSel = 0;
      const stars = document.querySelectorAll(".star-pick-btn");
      stars.forEach(btn => btn.classList.remove("selected", "hovered"));

      const thanks = document.getElementById("vote-thanks");
      if (thanks) thanks.classList.remove("visible");

      const submitBtn = document.getElementById("vote-submit-btn");
      if (submitBtn) submitBtn.textContent = "Submit Rating";

      if (removeBtn) {
        removeBtn.textContent = "Delete Rating";
        removeBtn.disabled = false;
        removeBtn.style.display = "none";
      }

      await renderGlobalRating();
    } catch (error) {
      console.error("Error removing rating:", error);
      alert("Failed to remove rating from the cloud.");
      if (removeBtn) { removeBtn.textContent = "Delete Rating"; removeBtn.disabled = false; }
    }
  }

  // ── FIREBASE COMMENTS ───────────────────────────────────────────────
  let commentsShown = 8;
  let commentFilter = "newest";

  async function initComments() {
    const session = window.Auth.getSession();
    const header = document.getElementById("comment-input-header");
    if (header && session) {
      header.innerHTML = `
        <div class="comment-avatar" style="background:linear-gradient(135deg,hsl(${session.id % 360},70%,50%),hsl(${((session.id % 360) + 60) % 360},70%,60%))">${session.username.charAt(0).toUpperCase()}</div>
        <div><div class="comment-author-name">${session.username}</div><div class="comment-auth-hint">Commenting as you</div></div>`;
    } else if (header) {
      header.innerHTML = `
        <div class="comment-avatar" style="background:var(--bg-surface)">?</div>
        <div><div class="comment-author-name">Guest</div><div class="comment-auth-hint"><a href="login.html" style="color:var(--accent-light)">Sign in</a> to join the discussion</div></div>`;
    }

    const textarea = document.getElementById("comment-textarea");
    const charCount = document.getElementById("comment-char-count");
    if (textarea && charCount) {
      textarea.addEventListener("input", () => {
        charCount.textContent = `${textarea.value.length}/${COMMENT_MAX}`;
        if (textarea.value.length > COMMENT_MAX)
          textarea.value = textarea.value.slice(0, COMMENT_MAX);
      });
    }

    const submitBtn = document.getElementById("comment-submit-btn");
    submitBtn?.addEventListener("click", postComment);

    document.querySelectorAll(".comment-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".comment-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        commentFilter = btn.dataset.filter;
        commentsShown = 8;
        renderComments();
      });
    });

    document.getElementById("comments-load-more")?.addEventListener("click", () => {
        commentsShown += 8;
        renderComments();
      });

    // Fetch the live comments from the cloud on load!
    await fetchCloudComments();
  }

  async function fetchCloudComments() {
    try {
      const ref = collection(db, `comments/${itemKey()}/list`);
      const snap = await getDocs(ref);
      currentComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderComments();
    } catch (e) {
      console.error("Failed to load comments", e);
    }
  }

  async function postComment() {
    const session = window.Auth.getSession();
    if (!session) {
      alert("Please sign in to comment!");
      window.location.href = "login.html";
      return;
    }

    const textarea = document.getElementById("comment-textarea");
    const text = textarea?.value.trim();
    if (!text || text.length < 2) return;

    const btn = document.getElementById("comment-submit-btn");
    if (btn) { btn.textContent = "Posting..."; btn.disabled = true; }

    const comment = {
      author: session.username,
      userId: session.id,
      text,
      rating: userStarSel || 0,
      ts: Date.now(),
      likes: 0,
    };

    try {
      const ref = collection(db, `comments/${itemKey()}/list`);
      await addDoc(ref, comment); // Push to Firestore
      
      if (textarea) textarea.value = "";
      const charCount = document.getElementById("comment-char-count");
      if (charCount) charCount.textContent = `0/${COMMENT_MAX}`;
      
      commentsShown = 8;
      await fetchCloudComments(); // Refresh the comment list

      document.getElementById("comments-list")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      console.error("Failed to post comment", e);
      alert("Could not post comment. Please try again.");
    }

    if (btn) { btn.textContent = "Post Comment"; btn.disabled = false; }
  }

  function renderComments() {
    const list = document.getElementById("comments-list");
    const countEl = document.getElementById("comments-count");
    if (!list) return;

    // Use the cloud comments we fetched
    let sortedComments = [...currentComments];

    if (commentFilter === "top") {
      sortedComments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (commentFilter === "rated") {
      sortedComments.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // Default: Newest first
      sortedComments.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    }

    if (countEl) countEl.textContent = `${sortedComments.length} comment${sortedComments.length !== 1 ? "s" : ""}`;

    const loadMoreBtn = document.getElementById("comments-load-more");
    if (loadMoreBtn) {
      loadMoreBtn.style.display = sortedComments.length > commentsShown ? "block" : "none";
    }

    if (sortedComments.length === 0) {
      list.innerHTML = `
        <div class="comments-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>`;
      return;
    }

    const likes = getLikes();
    const visible = sortedComments.slice(0, commentsShown);
    list.innerHTML = visible
      .map((c) => {
        const hue = (c.userId || c.author.charCodeAt(0)) % 360;
        const dateStr = timeAgo(c.ts);
        const liked = likes[c.id] || false;
        const starStr = c.rating ? "★".repeat(c.rating) + "☆".repeat(5 - c.rating) : ""; // Fixed to 5 stars!
        return `
        <div class="comment-card" id="cc-${c.id}">
          <div class="comment-card-header">
            <div class="comment-card-avatar" style="background:linear-gradient(135deg,hsl(${hue},70%,45%),hsl(${(hue + 60) % 360},70%,55%))">
              ${c.author.charAt(0).toUpperCase()}
            </div>
            <div class="comment-card-meta">
              <div class="comment-card-name">${escHtml(c.author)}</div>
              <div class="comment-card-time">${dateStr}</div>
            </div>
            ${starStr ? `<div class="comment-card-stars" title="${c.rating}/5">${starStr}</div>` : ""}
          </div>
          <p class="comment-card-text">${escHtml(c.text)}</p>
          <div class="comment-card-actions">
            <button class="comment-action-btn ${liked ? "liked" : ""}" onclick="Detail.likeComment('${c.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${liked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              ${c.likes || 0} Helpful
            </button>
            <button class="comment-action-btn" onclick="Detail.replyTo('${escHtml(c.author)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
              Reply
            </button>
          </div>
        </div>`;
      }).join("");
  }

  function escHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  async function likeComment(id) {
    const isLiked = toggleLike(id);
    
    // Update the UI immediately so it feels fast
    const btn = document.querySelector(`#cc-${id} .comment-action-btn`);
    if (btn) btn.classList.toggle("liked", isLiked);
    
    try {
      const ref = doc(db, `comments/${itemKey()}/list`, id);
      await updateDoc(ref, {
        likes: increment(isLiked ? 1 : -1)
      });
      await fetchCloudComments(); // Pull fresh data to update the counts perfectly
    } catch (e) {
      console.error("Failed to like comment", e);
      // Revert if it failed
      toggleLike(id); 
    }
  }

  function replyTo(author) {
    const textarea = document.getElementById("comment-textarea");
    if (!textarea) return;
    textarea.value = `@${author} `;
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    textarea.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── Misc Video & UI Handlers ──────────────────────────────
  function loadTrailerEmbed(key) {
    key = key || trailerKey;
    if (!key) return;
    const container = document.getElementById("trailer-embed-container");
    if (!container) return;
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${key}?autoplay=1&rel=0" 
      allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
  }

  function getWishlistStore() {
    return JSON.parse(localStorage.getItem("flixrate_wishlist") || "{}");
  }

  async function toggleWishlist() {
    const session = window.Auth.getSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    const key = itemKey();
    const btn = document.getElementById("btn-wishlist");
    if (btn) btn.disabled = true; // Prevent spam clicking

    try {
      // Fetch user's current cloud watchlist
      const userRef = doc(db, "users", String(session.id));
      const snap = await getDoc(userRef);
      let WL = snap.exists() && snap.data().watchlist ? snap.data().watchlist : {};

      if (WL[key]) {
        // Remove from Watchlist
        delete WL[key];
        await setDoc(userRef, { watchlist: WL }, { merge: true });
        
        // Update Local Storage backup (for the context menu / quick checks)
        localStorage.setItem("flixrate_wishlist", JSON.stringify(WL));
        
        if (btn) {
          btn.classList.remove("btn-ghost--active");
          btn.querySelector("span").textContent = "Add to List";
        }
      } else {
        // Add to Watchlist
        WL[key] = {
          id: currentItem.id,
          type: currentItem.type,
          title: currentItem.title,
          poster: currentItem.poster,
          year: currentItem.year,
          rating: currentItem.rating,
          addedAt: Date.now(),
        };
        await setDoc(userRef, { watchlist: WL }, { merge: true });
        
        // Update Local Storage backup
        localStorage.setItem("flixrate_wishlist", JSON.stringify(WL));
        
        if (btn) {
          btn.classList.add("btn-ghost--active");
          btn.querySelector("span").textContent = "In Watchlist ✓";
        }
      }
    } catch (e) {
      console.error("Failed to update cloud watchlist", e);
      alert("Failed to update watchlist. Please try again.");
    }
    
    if (btn) btn.disabled = false;
  }

  function createSimilarAnimeCard(anime) {
    const card = document.createElement("div");
    card.className = "similar-anime-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    const img = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
    const rating = anime.score ? parseFloat(anime.score).toFixed(1) : "N/A";

    card.dataset.ctxId = anime.mal_id;
    card.dataset.ctxType = "anime";
    card.dataset.ctxTitle = anime.title_english || anime.title || "";
    card.dataset.ctxPoster = img || "";
    card.dataset.ctxYear = anime.aired?.prop?.from?.year || "";
    card.dataset.ctxRating = rating !== "N/A" ? rating : "";

    card.innerHTML = `
      <div class="similar-anime-card-img-wrap">
        <img src="${img}" alt="${anime.title_english || anime.title}" class="similar-anime-card-img" loading="lazy" onerror="this.src='img/placeholder.svg'">
        <div class="similar-anime-card-overlay">
          <div class="similar-anime-card-play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
      </div>
      <div class="similar-anime-card-info">
        <div class="similar-anime-card-title">${anime.title_english || anime.title}</div>
        <div class="similar-anime-card-rating">★ ${rating}</div>
      </div>`;

    const detailUrl = `detail.html?type=anime&id=${anime.mal_id}`;
    card.addEventListener("click", () => (window.location.href = detailUrl));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") window.location.href = detailUrl;
    });

    return card;
  }   

  async function renderSimilarAnime() {
    if (TYPE !== "anime" || !currentItem) return; 

    const section = document.getElementById("similar-anime-section");
    const track = document.getElementById("similar-anime-track");
    if (!section || !track) return;

    try {
      const similar = await API.fetchSimilarAnime(currentItem.genres, 12);
      if (!similar || similar.length === 0) {
        section.style.display = "none";
        return;
      }

      const filtered = similar.filter((a) => a.mal_id !== ID).slice(0, 10);
      if (filtered.length === 0) {
        section.style.display = "none";
        return;
      }

      track.innerHTML = "";
      filtered.forEach((anime) => {
        track.appendChild(createSimilarAnimeCard(anime));
      });

      section.style.display = "block";
      setupSimilarAnimeScroll();
    } catch (e) {
      console.warn("Failed to render similar anime:", e.message);
      section.style.display = "none";
    }
  }

  function setupSimilarAnimeScroll() {
    const track = document.getElementById("similar-anime-track");
    const prevBtn = document.querySelector(".similar-anime-prev");
    const nextBtn = document.querySelector(".similar-anime-next");

    if (!track || !prevBtn || !nextBtn) return;

    const scrollAmount = 200;

    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });

    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }

  // ── Init ───────────────────────────────────────────────────
  async function init() {
    if (!ID) {
      document.getElementById("detail-error").style.display = "block";
      return;
    }

    if(window.Auth && typeof window.Auth.init === 'function') window.Auth.init();

    const WL = JSON.parse(localStorage.getItem("flixrate_wishlist") || "{}");
    const btn = document.getElementById("btn-wishlist");
    if (btn && WL[itemKey()]) {
      btn.classList.add("btn-ghost--active");
      btn.querySelector("span").textContent = "In Watchlist ✓";
    }

    try {
      currentItem = await fetchItem();
      if (!currentItem) throw new Error("Not found");
      await render(currentItem);
    } catch (e) {
      console.error("Detail fetch error:", e);
      document.getElementById("detail-loading").style.display = "none";
      document.getElementById("detail-error").style.display = "block";
      return;
    }

    document.getElementById("detail-loading").style.display = "none";
    document.getElementById("detail-main").style.display = "block";

    initStarPicker();
    await initComments();
    renderSimilarAnime();

    document.getElementById("vote-submit-btn")?.addEventListener("click", submitVote);
    document.getElementById("vote-remove-btn")?.addEventListener("click", removeVote);
    document.getElementById("btn-wishlist")?.addEventListener("click", toggleWishlist);
    document.getElementById("detail-trailer-btn")?.addEventListener("click", () => loadTrailerEmbed());
  }

  return {
    init,
    loadTrailer: () => loadTrailerEmbed(trailerKey),
    likeComment,
    replyTo,
  };
})();

// CRITICAL: Attach Detail to the global window so HTML buttons can use it!
window.Detail = Detail;

document.addEventListener("DOMContentLoaded", Detail.init);
