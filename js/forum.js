// ============================================================
// FlixRate – Forum Module (FIREBASE VERSION)
// ============================================================

import { auth, db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const Forum = (() => {
  const LIKES_KEY = "flixrate_forum_likes";
  const BOOKMARKS_KEY = "flixrate_forum_bookmarks";

  const CATEGORIES = [
    { id: "all", label: "All Posts", icon: "🏠" },
    { id: "movies", label: "Movies", icon: "🎬" },
    { id: "anime", label: "Anime", icon: "🎌" },
    { id: "tv", label: "TV Series", icon: "📺" },
    { id: "gaming", label: "Gaming", icon: "🎮" },
    { id: "music", label: "Music", icon: "🎵" },
    { id: "general", label: "General", icon: "💬" },
  ];

  const CAT_COLORS = {
    movies: "cat-movies",
    anime: "cat-anime",
    tv: "cat-tv",
    gaming: "cat-gaming",
    music: "cat-music",
    general: "cat-general",
  };

  let state = {
    activeCategory: "all",
    sort: "newest",
    searchQuery: "",
    tags: [],
    selectedCategory: "general",
    imageDataUrl: null,
  };

  let cloudPosts = [];

  function getLikes() {
    return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
  }
  function getBookmarks() {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "{}");
  }

  function esc(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(ts).toLocaleDateString();
  }
  function avatarColor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${((h % 360) + 360) % 360},65%,50%)`;
  }
  function avatarLetter(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  async function fetchPosts() {
    try {
      const q = query(collection(db, "forum_posts"), orderBy("ts", "desc"));
      const snap = await getDocs(q);
      cloudPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Failed to fetch forum posts:", e);
      showToast("Could not load posts. Please refresh.");
    }
  }

  function getFilteredPosts() {
    let posts = [...cloudPosts];

    if (state.activeCategory !== "all") {
      posts = posts.filter((p) => p.category === state.activeCategory);
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.text || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (state.sort === "popular") {
      posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (state.sort === "discussed") {
      posts.sort(
        (a, b) => (b.comments?.length || 0) - (a.comments?.length || 0),
      );
    } else {
      posts.sort((a, b) => b.ts - a.ts);
    }
    return posts;
  }

  function getCategoryCounts() {
    const counts = {};
    CATEGORIES.forEach((c) => {
      counts[c.id] = 0;
    });
    counts["all"] = cloudPosts.length;
    cloudPosts.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }

  function renderSidebar() {
    const list = document.getElementById("category-list");
    if (!list) return;
    const counts = getCategoryCounts();

    list.innerHTML = CATEGORIES.map(
      (cat) => `
      <li class="category-item">
        <button class="${state.activeCategory === cat.id ? "active" : ""}"
                onclick="window.Forum.setCategory('${cat.id}')">
          <span class="category-icon">${cat.icon}</span>
          ${cat.label}
          <span class="category-count">${counts[cat.id] || 0}</span>
        </button>
      </li>`,
    ).join("");
  }

  function renderFeed() {
    const feedEl = document.getElementById("post-feed");
    if (!feedEl) return;

    const posts = getFilteredPosts();
    const likes = getLikes();
    const bmarks = getBookmarks();
    const session = window.Auth.getSession();
    const myAvatar = localStorage.getItem("flixrate_profile_avatar");

    let html = "";
    if (state.searchQuery) {
      html += `<div style="margin-bottom: 20px; font-weight: 500; font-size: 1.1rem; color: var(--accent-light);">Search results for "${esc(state.searchQuery)}" (${posts.length})</div>`;
    }

    if (posts.length === 0) {
      feedEl.innerHTML =
        html +
        `
        <div class="feed-empty">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3>${state.searchQuery ? "No results found" : "No posts yet"}</h3>
          <p>${state.searchQuery ? "Try adjusting your search terms." : "Be the first to start a discussion!"}</p>
        </div>`;
      return;
    }

    feedEl.innerHTML =
      html +
      posts
        .map((post) => renderPostCard(post, likes, bmarks, session, myAvatar))
        .join("");

    feedEl.querySelectorAll(".post-text").forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 4) {
        const btn = el.nextElementSibling;
        if (btn?.classList.contains("post-read-more"))
          btn.style.display = "block";
      }
    });
  }

  function renderPostCard(post, likes, bmarks, session, myAvatar) {
    const liked = likes[post.id] || false;
    const bmarked = bmarks[post.id] || false;
    const catColor = CAT_COLORS[post.category] || "cat-general";
    const catMeta =
      CATEGORIES.find((c) => c.id === post.category) || CATEGORIES[6];

    // 🟨 THE ILLUSION: Inject live local avatar for the Post Author
    const isOwner = session?.username === post.author;
    const authorAvatarHtml =
      isOwner && myAvatar
        ? `<img src="${myAvatar}" alt="${esc(post.author)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : avatarLetter(post.author);
    const authorAvatarBg =
      isOwner && myAvatar ? "transparent" : avatarColor(post.author);

    const commentCount = post.comments?.length || 0;

    return `
      <div class="post-card" id="post-${post.id}">
        <div class="post-card-header">
          <div class="post-avatar" style="background:${authorAvatarBg}; padding:0; overflow:hidden;"
               title="${esc(post.author)}">
            ${authorAvatarHtml}
          </div>
          <div class="post-meta">
            <div class="post-author">${esc(post.author)}</div>
            <div class="post-time-cat">
              <span>${timeAgo(post.ts)}</span>
              <span>·</span>
              <span class="post-cat-pill ${catColor}">${catMeta.icon} ${catMeta.label}</span>
            </div>
          </div>
          <div class="post-card-menu">
            <button class="post-menu-btn" onclick="window.Forum.toggleMenu('${post.id}')" aria-label="Post options">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            <div class="post-dropdown" id="menu-${post.id}">
              <button onclick="window.Forum.copyPostLink('${post.id}')">🔗 Copy Link</button>
              ${isOwner ? `<button class="danger" onclick="window.Forum.deletePost('${post.id}')">🗑️ Delete Post</button>` : `<button onclick="window.Forum.reportPost('${post.id}')">⚑ Report</button>`}
            </div>
          </div>
        </div>

        <div class="post-body">
          ${post.title ? `<div class="post-title" onclick="window.Forum.toggleComments('${post.id}')">${esc(post.title)}</div>` : ""}
          ${
            post.text
              ? `
            <p class="post-text collapsed" id="pt-${post.id}">${esc(post.text)}</p>
            <button class="post-read-more" style="display:none"
                    onclick="window.Forum.toggleExpand('${post.id}')">Read more</button>
          `
              : ""
          }
          ${
            post.image
              ? `
            <div class="post-image-wrap" onclick="window.Forum.openLightbox('${post.id}')">
              <img src="${post.image}" alt="Post image" class="post-image" loading="lazy">
            </div>
          `
              : ""
          }
          ${
            post.tags?.length
              ? `
            <div class="post-tags">
              ${post.tags.map((t) => `<span class="post-tag" onclick="window.Forum.searchTag('${esc(t)}')">#${esc(t)}</span>`).join("")}
            </div>`
              : ""
          }
        </div>

        <div class="post-actions">
          <button class="post-action-btn ${liked ? "liked" : ""}"
                  onclick="window.Forum.toggleLike('${post.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill="${liked ? "currentColor" : "none"}"
                 stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${post.likes || 0}
          </button>
          <button class="post-action-btn" onclick="window.Forum.toggleComments('${post.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            ${commentCount}
          </button>
          <div class="post-action-sep"></div>
          <button class="post-action-btn ${bmarked ? "bookmarked" : ""}"
                  onclick="window.Forum.toggleBookmark('${post.id}')" title="${bmarked ? "Saved" : "Save"}">
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill="${bmarked ? "currentColor" : "none"}"
                 stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            ${bmarked ? "Saved" : "Save"}
          </button>
          <button class="post-action-btn" onclick="window.Forum.sharePost('${post.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>

        <div class="post-comments" id="comments-${post.id}">
          ${renderPostComments(post, session, myAvatar)}
          <div class="comment-input-row">
            <div class="comment-mini-avatar"
                 style="background:${session && myAvatar ? "transparent" : session ? avatarColor(session.username) : "#4b5563"}; padding:0; overflow:hidden;">
              ${session && myAvatar ? `<img src="${myAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : session ? avatarLetter(session.username) : "?"}
            </div>
            <input class="comment-mini-input" placeholder="${session ? "Write a reply…" : "Sign in to comment"}"
                   id="ci-${post.id}" ${!session ? "disabled" : ""}
                   onkeydown="if(event.key==='Enter')window.Forum.submitComment('${post.id}')">
            <button class="comment-mini-send" onclick="window.Forum.submitComment('${post.id}')"
                    ${!session ? "disabled" : ""}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderPostComments(post, session, myAvatar) {
    if (!post.comments?.length)
      return '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;">No replies yet. Start the conversation!</p>';

    return post.comments
      .map((c) => {
        // 🟨 THE ILLUSION: Inject live local avatar for Comment Replies
        const isMe = session && c.author === session.username;
        const cAvatarHtml =
          isMe && myAvatar
            ? `<img src="${myAvatar}" alt="${esc(c.author)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : avatarLetter(c.author);
        const cAvatarBg =
          isMe && myAvatar ? "transparent" : avatarColor(c.author);

        return `
      <div class="post-comment-item">
        <div class="comment-mini-avatar" style="background:${cAvatarBg}; padding:0; overflow:hidden;">
          ${cAvatarHtml}
        </div>
        <div class="comment-mini-bubble">
          <div class="comment-mini-name">${esc(c.author)} <span style="font-weight:400;color:var(--text-muted);font-size:0.72rem;">${timeAgo(c.ts)}</span></div>
          <div class="comment-mini-text">${esc(c.text)}</div>
        </div>
      </div>`;
      })
      .join("");
  }

  function renderTrending() {
    const el = document.getElementById("trending-topics");
    if (!el) return;
    const tagCount = {};
    cloudPosts.forEach((p) =>
      (p.tags || []).forEach((t) => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      }),
    );
    const sorted = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (!sorted.length) {
      el.innerHTML =
        '<p style="font-size:0.82rem;color:var(--text-muted)">No trending topics yet.</p>';
      return;
    }
    el.innerHTML = sorted
      .map(
        ([tag, count], i) => `
      <div class="trending-item" onclick="window.Forum.searchTag('${esc(tag)}')">
        <span class="trending-num">${i + 1}</span>
        <div class="trending-info">
          <div class="trending-tag">#${esc(tag)}</div>
          <div class="trending-count">${count} post${count !== 1 ? "s" : ""}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  function renderOnlineUsers() {
    const el = document.getElementById("online-users");
    if (!el) return;
    const users = [
      ...new Set(cloudPosts.slice(0, 20).map((p) => p.author)),
    ].slice(0, 12);

    if (!users.length) {
      el.innerHTML =
        '<p style="font-size:0.82rem;color:var(--text-muted)">No one online yet.</p>';
      return;
    }

    const session = window.Auth.getSession();
    const myAvatar = localStorage.getItem("flixrate_profile_avatar");

    el.innerHTML =
      `<div class="online-avatars">` +
      users
        .map((u) => {
          // 🟨 THE ILLUSION: Even update the active user avatars widget!
          const isMe = session && u === session.username;
          const uAvatarHtml =
            isMe && myAvatar
              ? `<img src="${myAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
              : avatarLetter(u);
          const uAvatarBg = isMe && myAvatar ? "transparent" : avatarColor(u);

          return `
        <div class="online-avatar" style="background:${uAvatarBg}; padding:0; overflow:hidden;" title="${esc(u)}">
          ${uAvatarHtml}
          <span class="online-dot"></span>
        </div>`;
        })
        .join("") +
      `</div>`;
  }

  async function toggleLike(postId) {
    const session = window.Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }

    const likes = getLikes();
    const isLiked = !likes[postId];
    likes[postId] = isLiked;
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));

    const post = cloudPosts.find((p) => p.id === postId);
    if (post) post.likes = Math.max(0, (post.likes || 0) + (isLiked ? 1 : -1));
    renderFeed();

    try {
      const ref = doc(db, "forum_posts", postId);
      await updateDoc(ref, { likes: increment(isLiked ? 1 : -1) });
    } catch (e) {
      console.error("Failed to update like", e);
    }
  }

  function toggleBookmark(postId) {
    const session = window.Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }
    const bmarks = getBookmarks();
    bmarks[postId] = !bmarks[postId];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bmarks));
    renderFeed();
  }

  async function submitComment(postId) {
    const session = window.Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }

    const input = document.getElementById(`ci-${postId}`);
    const text = input?.value.trim();
    if (!text || text.length < 1) return;

    if (input) {
      input.disabled = true;
      input.value = "Posting...";
    }

    const commentObj = { author: session.username, text, ts: Date.now() };

    try {
      const ref = doc(db, "forum_posts", postId);
      await updateDoc(ref, { comments: arrayUnion(commentObj) });
      if (input) {
        input.value = "";
        input.disabled = false;
      }

      await fetchPosts();
      const commentsEl = document.getElementById(`comments-${postId}`);
      const wasOpen = commentsEl
        ? commentsEl.classList.contains("open")
        : false;
      renderAll();
      if (wasOpen)
        document.getElementById(`comments-${postId}`)?.classList.add("open");
    } catch (e) {
      console.error("Failed to post comment", e);
      alert("Failed to post comment.");
      if (input) {
        input.value = text;
        input.disabled = false;
      }
    }
  }

  function toggleComments(postId) {
    document.getElementById(`comments-${postId}`)?.classList.toggle("open");
  }

  async function deletePost(postId) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "forum_posts", postId));
      await fetchPosts();
      renderAll();
      showToast("Post deleted.");
    } catch (e) {
      console.error("Failed to delete post", e);
      alert("Failed to delete post.");
    }
  }

  function toggleMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    if (!menu) return;
    const isOpen = menu.classList.contains("open");
    document
      .querySelectorAll(".post-dropdown.open")
      .forEach((m) => m.classList.remove("open"));
    if (!isOpen) menu.classList.add("open");
  }

  function toggleExpand(postId) {
    const el = document.getElementById(`pt-${postId}`);
    const btn = el?.nextElementSibling;
    if (!el || !btn) return;
    const collapsed = el.classList.toggle("collapsed");
    btn.textContent = collapsed ? "Read more" : "Show less";
  }

  function setCategory(catId) {
    state.activeCategory = catId;
    renderSidebar();
    renderFeed();
  }

  function setSort(sortKey) {
    state.sort = sortKey;
    document.querySelectorAll(".sort-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.sort === sortKey);
    });
    renderFeed();
  }

  function searchTag(tag) {
    state.searchQuery = tag;
    const input = document.getElementById("forum-search-input");
    if (input) input.value = tag;
    renderFeed();
  }

  function doSearch(q) {
    state.searchQuery = q ? q.trim() : "";
    renderFeed();
  }

  function copyPostLink(postId) {
    const url = `${window.location.href.split("?")[0]}?post=${postId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast("Link copied!");
    closeAllMenus();
  }
  function sharePost(postId) {
    copyPostLink(postId);
  }
  function reportPost(postId) {
    showToast("Post reported. Thank you!");
    closeAllMenus();
  }
  function closeAllMenus() {
    document
      .querySelectorAll(".post-dropdown.open")
      .forEach((m) => m.classList.remove("open"));
  }

  function openLightbox(postId) {
    const post = cloudPosts.find((p) => p.id === postId);
    if (!post?.image) return;
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");
    if (lb && img) {
      img.src = post.image;
      lb.classList.add("open");
    }
  }
  function closeLightbox() {
    document.getElementById("lightbox")?.classList.remove("open");
  }

  function showToast(msg) {
    const t = document.getElementById("forum-toast");
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(10px)";
    }, 2200);
  }

  function openLoginPrompt() {
    if (confirm("You need to sign in to do that. Go to login page?")) {
      window.location.href = "login.html";
    }
  }

  function openCreateModal() {
    const session = window.Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }

    state.tags = [];
    state.imageDataUrl = null;

    const titleInput = document.getElementById("post-title-input");
    const textarea = document.getElementById("post-textarea");
    const preview = document.getElementById("image-preview");
    const upArea = document.getElementById("image-upload-area");
    const removeBtn = document.getElementById("remove-image-btn");

    if (titleInput) titleInput.value = "";
    if (textarea) textarea.value = "";
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    if (upArea) upArea.classList.remove("has-image");
    if (removeBtn) removeBtn.style.display = "none";

    document.querySelectorAll(".tag-chip").forEach((c) => c.remove());
    const tagInput = document.getElementById("tag-input");
    if (tagInput) tagInput.value = "";

    state.selectedCategory = "general";
    document.querySelectorAll(".cat-select-btn").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.cat === "general");
    });

    const userRow = document.getElementById("modal-user-row");
    const myAvatar = localStorage.getItem("flixrate_profile_avatar");
    if (userRow) {
      const avatarHtml = myAvatar
        ? `<img src="${myAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : avatarLetter(session.username);
      const avatarBg = myAvatar ? "transparent" : avatarColor(session.username);

      userRow.innerHTML = `
        <div class="post-avatar" style="background:${avatarBg};width:36px;height:36px;font-size:0.9rem;padding:0;overflow:hidden;">
          ${avatarHtml}
        </div>
        <div style="font-size:0.9rem;font-weight:700;color:var(--text-primary)">${esc(session.username)}</div>`;
    }

    document.getElementById("create-post-modal")?.classList.add("open");
    document.body.style.overflow = "hidden";
    titleInput?.focus();
  }

  function closeCreateModal() {
    document.getElementById("create-post-modal")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  async function submitPost() {
    const session = window.Auth.getSession();
    if (!session) return;

    const title = document.getElementById("post-title-input")?.value.trim();
    const text = document.getElementById("post-textarea")?.value.trim();

    if (!title && !text && !state.imageDataUrl) {
      showToast("Please add some content first!");
      return;
    }

    const btn = document.getElementById("post-submit-btn");
    if (btn) {
      btn.textContent = "Posting...";
      btn.disabled = true;
    }

    const postData = {
      author: session.username,
      title: title || "",
      text: text || "",
      image: state.imageDataUrl || null,
      category: state.selectedCategory,
      tags: [...state.tags],
      likes: 0,
      comments: [],
      ts: Date.now(),
    };

    try {
      await addDoc(collection(db, "forum_posts"), postData);
      closeCreateModal();
      state.activeCategory = "all";
      await fetchPosts();
      renderAll();
      showToast("Post shared! 🎉");
      document
        .getElementById("post-feed")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.error("Failed to create post", e);
      alert("Error posting. Please try again.");
    }

    if (btn) {
      btn.textContent = "Share Post 🚀";
      btn.disabled = false;
    }
  }

  function handleImageUpload(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please select an image file.");
      return;
    }
    if (file.size > 700 * 1024) {
      showToast("Image must be under 700KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      state.imageDataUrl = e.target.result;
      const preview = document.getElementById("image-preview");
      const upArea = document.getElementById("image-upload-area");
      const removeBtn = document.getElementById("remove-image-btn");
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = "block";
      }
      if (upArea) upArea.classList.add("has-image");
      if (removeBtn) removeBtn.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    state.imageDataUrl = null;
    const preview = document.getElementById("image-preview");
    const upArea = document.getElementById("image-upload-area");
    const removeBtn = document.getElementById("remove-image-btn");
    const fileInput = document.getElementById("image-file-input");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    if (upArea) upArea.classList.remove("has-image");
    if (removeBtn) removeBtn.style.display = "none";
    if (fileInput) fileInput.value = "";
  }

  function addTag(value) {
    const tag = value.trim().replace(/^#/, "").toLowerCase();
    if (!tag || state.tags.includes(tag) || state.tags.length >= 5) return;
    state.tags.push(tag);
    const wrap = document.getElementById("tags-input-wrap");
    const input = document.getElementById("tag-input");
    if (wrap && input) {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.dataset.tag = tag;
      chip.innerHTML = `#${esc(tag)} <button class="tag-chip-remove" onclick="window.Forum.removeTagChip('${esc(tag)}')">×</button>`;
      wrap.insertBefore(chip, input);
      input.value = "";
    }
  }

  function removeTagChip(tag) {
    state.tags = state.tags.filter((t) => t !== tag);
    document.querySelector(`.tag-chip[data-tag="${tag}"]`)?.remove();
  }

  function renderAll() {
    renderSidebar();
    renderFeed();
    renderTrending();
    renderOnlineUsers();
  }

  async function init() {
    if (window.Auth && typeof window.Auth.init === "function")
      window.Auth.init();

    await fetchPosts();
    renderAll();

    document.querySelectorAll(".sort-tab").forEach((btn) => {
      btn.addEventListener("click", () => setSort(btn.dataset.sort));
    });

    const searchInput = document.getElementById("forum-search-input");
    let debounce = null;
    searchInput?.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => doSearch(searchInput.value), 350);
    });
    searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(debounce);
        doSearch(searchInput.value);
      }
    });
    document
      .getElementById("forum-search-btn")
      ?.addEventListener("click", () => {
        clearTimeout(debounce);
        doSearch(searchInput?.value);
      });

    document
      .getElementById("btn-new-post")
      ?.addEventListener("click", openCreateModal);
    document
      .getElementById("modal-close-btn")
      ?.addEventListener("click", closeCreateModal);
    document
      .getElementById("create-post-modal")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "create-post-modal") closeCreateModal();
      });

    const uploadArea = document.getElementById("image-upload-area");
    const fileInput = document.getElementById("image-file-input");
    uploadArea?.addEventListener("click", (e) => {
      if (e.target.closest("#remove-image-btn")) return;
      fileInput?.click();
    });
    uploadArea?.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--accent)";
    });
    uploadArea?.addEventListener("dragleave", () => {
      uploadArea.style.borderColor = "";
    });
    uploadArea?.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "";
      handleImageUpload(e.dataTransfer.files[0]);
    });
    fileInput?.addEventListener("change", (e) =>
      handleImageUpload(e.target.files[0]),
    );
    document
      .getElementById("remove-image-btn")
      ?.addEventListener("click", removeImage);

    const tagInput = document.getElementById("tag-input");
    tagInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput.value);
      }
      if (e.key === "Backspace" && !tagInput.value && state.tags.length)
        removeTagChip(state.tags[state.tags.length - 1]);
    });
    tagInput?.addEventListener("blur", () => {
      if (tagInput.value) addTag(tagInput.value);
    });

    document.querySelectorAll(".cat-select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".cat-select-btn")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.selectedCategory = btn.dataset.cat;
      });
    });

    document
      .getElementById("post-submit-btn")
      ?.addEventListener("click", submitPost);

    const textarea = document.getElementById("post-textarea");
    const charCount = document.getElementById("post-char-count");
    textarea?.addEventListener("input", () => {
      if (charCount) charCount.textContent = `${textarea.value.length}/2000`;
      if (textarea.value.length > 2000)
        textarea.value = textarea.value.slice(0, 2000);
    });

    document
      .getElementById("lightbox-close")
      ?.addEventListener("click", closeLightbox);
    document.getElementById("lightbox")?.addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".post-card-menu")) closeAllMenus();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeCreateModal();
        closeLightbox();
      }
    });
  }

  return {
    init,
    setCategory,
    setSort,
    searchTag,
    toggleLike,
    toggleBookmark,
    toggleComments,
    submitComment,
    deletePost,
    reportPost,
    toggleMenu,
    toggleExpand,
    copyPostLink,
    sharePost,
    openLightbox,
    closeLightbox,
    removeTagChip,
  };
})();

// CRITICAL: Bind to window so HTML onClick attributes can access it!
window.Forum = Forum;
document.addEventListener("DOMContentLoaded", Forum.init);
