// ============================================================
// FlixRate – Forum Module (mini social feed with image support)
// All data stored in localStorage for demo purposes
// ============================================================

const Forum = (() => {
  const POSTS_KEY = "flixrate_forum_posts";
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

  // ── Storage ────────────────────────────────────────────────
  function getPosts() {
    return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
  }
  function getLikes() {
    return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
  }
  function getBookmarks() {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "{}");
  }

  function savePosts(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }

  // ── Helpers ────────────────────────────────────────────────
  function uid() {
    return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

  // ── Filter & sort posts ────────────────────────────────────
  function getFilteredPosts() {
    let posts = getPosts();

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
      posts = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (state.sort === "discussed") {
      posts = [...posts].sort(
        (a, b) => (b.comments?.length || 0) - (a.comments?.length || 0),
      );
    } else {
      posts = [...posts].sort((a, b) => b.ts - a.ts);
    }
    return posts;
  }

  // ── Category counts ────────────────────────────────────────
  function getCategoryCounts() {
    const posts = getPosts();
    const counts = {};
    CATEGORIES.forEach((c) => {
      counts[c.id] = 0;
    });
    counts["all"] = posts.length;
    posts.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }

  // ── Render category sidebar ────────────────────────────────
  function renderSidebar() {
    const list = document.getElementById("category-list");
    if (!list) return;
    const counts = getCategoryCounts();

    list.innerHTML = CATEGORIES.map(
      (cat) => `
      <li class="category-item">
        <button class="${state.activeCategory === cat.id ? "active" : ""}"
                onclick="Forum.setCategory('${cat.id}')">
          <span class="category-icon">${cat.icon}</span>
          ${cat.label}
          <span class="category-count">${counts[cat.id] || 0}</span>
        </button>
      </li>`,
    ).join("");
  }

  // ── Render feed ────────────────────────────────────────────
  function renderFeed() {
    const feedEl = document.getElementById("post-feed");
    if (!feedEl) return;

    const posts = getFilteredPosts();
    const likes = getLikes();
    const bmarks = getBookmarks();
    const session = Auth.getSession();

    if (posts.length === 0) {
      feedEl.innerHTML = `
        <div class="feed-empty">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3>No posts yet</h3>
          <p>Be the first to start a discussion!</p>
        </div>`;
      return;
    }

    feedEl.innerHTML = posts
      .map((post) => renderPostCard(post, likes, bmarks, session))
      .join("");

    // Expand post texts
    feedEl.querySelectorAll(".post-text").forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 4) {
        const btn = el.nextElementSibling;
        if (btn?.classList.contains("post-read-more"))
          btn.style.display = "block";
      }
    });
  }

  function renderPostCard(post, likes, bmarks, session) {
    const liked = likes[post.id] || false;
    const bmarked = bmarks[post.id] || false;
    const catColor = CAT_COLORS[post.category] || "cat-general";
    const catMeta =
      CATEGORIES.find((c) => c.id === post.category) || CATEGORIES[6];
    const isOwner = session?.username === post.author;

    const commentCount = post.comments?.length || 0;

    return `
      <div class="post-card" id="post-${post.id}">
        <div class="post-card-header">
          <div class="post-avatar" style="background:${avatarColor(post.author)}"
               title="${esc(post.author)}">
            ${avatarLetter(post.author)}
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
            <button class="post-menu-btn" onclick="Forum.toggleMenu('${post.id}')" aria-label="Post options">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            <div class="post-dropdown" id="menu-${post.id}">
              <button onclick="Forum.copyPostLink('${post.id}')">🔗 Copy Link</button>
              ${isOwner ? `<button class="danger" onclick="Forum.deletePost('${post.id}')">🗑️ Delete Post</button>` : `<button onclick="Forum.reportPost('${post.id}')">⚑ Report</button>`}
            </div>
          </div>
        </div>

        <div class="post-body">
          ${post.title ? `<div class="post-title" onclick="Forum.toggleComments('${post.id}')">${esc(post.title)}</div>` : ""}
          ${
            post.text
              ? `
            <p class="post-text collapsed" id="pt-${post.id}">${esc(post.text)}</p>
            <button class="post-read-more" style="display:none"
                    onclick="Forum.toggleExpand('${post.id}')">Read more</button>
          `
              : ""
          }
          ${
            post.image
              ? `
            <div class="post-image-wrap" onclick="Forum.openLightbox('${post.id}')">
              <img src="${post.image}" alt="Post image" class="post-image" loading="lazy">
            </div>
          `
              : ""
          }
          ${
            post.tags?.length
              ? `
            <div class="post-tags">
              ${post.tags.map((t) => `<span class="post-tag" onclick="Forum.searchTag('${esc(t)}')">#${esc(t)}</span>`).join("")}
            </div>`
              : ""
          }
        </div>

        <div class="post-actions">
          <button class="post-action-btn ${liked ? "liked" : ""}"
                  onclick="Forum.toggleLike('${post.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill="${liked ? "currentColor" : "none"}"
                 stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${post.likes || 0}
          </button>
          <button class="post-action-btn" onclick="Forum.toggleComments('${post.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            ${commentCount}
          </button>
          <div class="post-action-sep"></div>
          <button class="post-action-btn ${bmarked ? "bookmarked" : ""}"
                  onclick="Forum.toggleBookmark('${post.id}')" title="${bmarked ? "Saved" : "Save"}">
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill="${bmarked ? "currentColor" : "none"}"
                 stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            ${bmarked ? "Saved" : "Save"}
          </button>
          <button class="post-action-btn" onclick="Forum.sharePost('${post.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>

        <div class="post-comments" id="comments-${post.id}">
          ${renderPostComments(post)}
          <div class="comment-input-row">
            <div class="comment-mini-avatar"
                 style="background:${session ? avatarColor(session.username) : "#4b5563"}">
              ${session ? avatarLetter(session.username) : "?"}
            </div>
            <input class="comment-mini-input" placeholder="${session ? "Write a reply…" : "Sign in to comment"}"
                   id="ci-${post.id}" ${!session ? "disabled" : ""}
                   onkeydown="if(event.key==='Enter')Forum.submitComment('${post.id}')">
            <button class="comment-mini-send" onclick="Forum.submitComment('${post.id}')"
                    ${!session ? "disabled" : ""}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderPostComments(post) {
    if (!post.comments?.length)
      return '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;">No replies yet. Start the conversation!</p>';
    return post.comments
      .map(
        (c) => `
      <div class="post-comment-item">
        <div class="comment-mini-avatar" style="background:${avatarColor(c.author)}">
          ${avatarLetter(c.author)}
        </div>
        <div class="comment-mini-bubble">
          <div class="comment-mini-name">${esc(c.author)} <span style="font-weight:400;color:var(--text-muted);font-size:0.72rem;">${timeAgo(c.ts)}</span></div>
          <div class="comment-mini-text">${esc(c.text)}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  // ── Trending widget ────────────────────────────────────────
  function renderTrending() {
    const el = document.getElementById("trending-topics");
    if (!el) return;
    const posts = getPosts();
    const tagCount = {};
    posts.forEach((p) =>
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
      <div class="trending-item" onclick="Forum.searchTag('${esc(tag)}')">
        <span class="trending-num">${i + 1}</span>
        <div class="trending-info">
          <div class="trending-tag">#${esc(tag)}</div>
          <div class="trending-count">${count} post${count !== 1 ? "s" : ""}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  // ── Online users widget ────────────────────────────────────
  function renderOnlineUsers() {
    const el = document.getElementById("online-users");
    if (!el) return;
    const posts = getPosts();
    const users = [...new Set(posts.slice(0, 20).map((p) => p.author))].slice(
      0,
      12,
    );
    if (!users.length) {
      el.innerHTML =
        '<p style="font-size:0.82rem;color:var(--text-muted)">No one online yet.</p>';
      return;
    }
    el.innerHTML =
      `<div class="online-avatars">` +
      users
        .map(
          (u) => `
        <div class="online-avatar" style="background:${avatarColor(u)}" title="${esc(u)}">
          ${avatarLetter(u)}
          <span class="online-dot"></span>
        </div>`,
        )
        .join("") +
      `</div>`;
  }

  // ── Like ───────────────────────────────────────────────────
  function toggleLike(postId) {
    const session = Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }

    const likes = getLikes();
    const isLiked = !likes[postId];
    likes[postId] = isLiked;
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));

    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
    if (post) {
      post.likes = Math.max(0, (post.likes || 0) + (isLiked ? 1 : -1));
      savePosts(posts);
    }
    renderFeed();
    renderSidebar();
  }

  // ── Bookmark ───────────────────────────────────────────────
  function toggleBookmark(postId) {
    const session = Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }
    const bmarks = getBookmarks();
    bmarks[postId] = !bmarks[postId];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bmarks));
    renderFeed();
  }

  // ── Comment ───────────────────────────────────────────────
  function submitComment(postId) {
    const session = Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }

    const input = document.getElementById(`ci-${postId}`);
    const text = input?.value.trim();
    if (!text || text.length < 1) return;

    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (!post.comments) post.comments = [];
    post.comments.push({ author: session.username, text, ts: Date.now() });
    savePosts(posts);

    if (input) input.value = "";

    // Re-render just this post's comment section
    const commentsEl = document.getElementById(`comments-${postId}`);
    if (commentsEl) {
      const open = commentsEl.classList.contains("open");
      renderFeed();
      if (open)
        document.getElementById(`comments-${postId}`)?.classList.add("open");
    }
    renderSidebar();
    renderTrending();
  }

  // ── Comments toggle ────────────────────────────────────────
  function toggleComments(postId) {
    document.getElementById(`comments-${postId}`)?.classList.toggle("open");
  }

  // ── Delete post ────────────────────────────────────────────
  function deletePost(postId) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const posts = getPosts().filter((p) => p.id !== postId);
    savePosts(posts);
    renderAll();
  }

  // ── Menu toggle ────────────────────────────────────────────
  function toggleMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    if (!menu) return;
    const isOpen = menu.classList.contains("open");
    // Close all
    document
      .querySelectorAll(".post-dropdown.open")
      .forEach((m) => m.classList.remove("open"));
    if (!isOpen) menu.classList.add("open");
  }

  // ── Expand post text ───────────────────────────────────────
  function toggleExpand(postId) {
    const el = document.getElementById(`pt-${postId}`);
    const btn = el?.nextElementSibling;
    if (!el || !btn) return;
    const collapsed = el.classList.toggle("collapsed");
    btn.textContent = collapsed ? "Read more" : "Show less";
  }

  // ── Category ───────────────────────────────────────────────
  function setCategory(catId) {
    state.activeCategory = catId;
    renderSidebar();
    renderFeed();
  }

  // ── Sort ───────────────────────────────────────────────────
  function setSort(sortKey) {
    state.sort = sortKey;
    document.querySelectorAll(".sort-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.sort === sortKey);
    });
    renderFeed();
  }

  // ── Search ─────────────────────────────────────────────────
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

  // ── Share / copy ───────────────────────────────────────────
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

  // ── Lightbox ───────────────────────────────────────────────
  function openLightbox(postId) {
    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
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

  // ── Toast ──────────────────────────────────────────────────
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

  // ── Login prompt ───────────────────────────────────────────
  function openLoginPrompt() {
    if (confirm("You need to sign in to do that. Go to login page?")) {
      window.location.href = "login.html";
    }
  }

  // ── Create Post Modal ─────────────────────────────────────
  function openCreateModal() {
    const session = Auth.getSession();
    if (!session) {
      openLoginPrompt();
      return;
    }

    state.tags = [];
    state.imageDataUrl = null;

    // Reset form
    const titleInput = document.getElementById("post-title-input");
    const textarea = document.getElementById("post-textarea");
    const preview = document.getElementById("image-preview");
    const upArea = document.getElementById("image-upload-area");
    const removeBtn = document.getElementById("remove-image-btn");
    const tagsWrap = document.getElementById("tags-input-wrap");
    if (titleInput) titleInput.value = "";
    if (textarea) textarea.value = "";
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    if (upArea) upArea.classList.remove("has-image");
    if (removeBtn) removeBtn.style.display = "none";

    // Reset tag chips
    document.querySelectorAll(".tag-chip").forEach((c) => c.remove());
    const tagInput = document.getElementById("tag-input");
    if (tagInput) tagInput.value = "";

    // Reset category selection
    state.selectedCategory = "general";
    document.querySelectorAll(".cat-select-btn").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.cat === "general");
    });

    // Set modal user display
    const userRow = document.getElementById("modal-user-row");
    if (userRow) {
      userRow.innerHTML = `
        <div class="post-avatar" style="background:${avatarColor(session.username)};width:36px;height:36px;font-size:0.9rem">
          ${avatarLetter(session.username)}
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

  function submitPost() {
    const session = Auth.getSession();
    if (!session) return;
    const title = document.getElementById("post-title-input")?.value.trim();
    const text = document.getElementById("post-textarea")?.value.trim();
    if (!title && !text && !state.imageDataUrl) {
      showToast("Please add some content first!");
      return;
    }

    const post = {
      id: uid(),
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

    const posts = getPosts();
    posts.unshift(post);
    savePosts(posts);

    closeCreateModal();
    state.activeCategory = "all";
    renderAll();
    showToast("Post shared! 🎉");
    // Scroll to top of feed
    document
      .getElementById("post-feed")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Image upload ───────────────────────────────────────────
  function handleImageUpload(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5 MB.");
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

  // ── Tags input ─────────────────────────────────────────────
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
      chip.innerHTML = `#${esc(tag)} <button class="tag-chip-remove" onclick="Forum.removeTagChip('${esc(tag)}')">×</button>`;
      wrap.insertBefore(chip, input);
      input.value = "";
    }
  }

  function removeTagChip(tag) {
    state.tags = state.tags.filter((t) => t !== tag);
    document.querySelector(`.tag-chip[data-tag="${tag}"]`)?.remove();
  }

  // ── Render all ────────────────────────────────────────────
  function renderAll() {
    renderSidebar();
    renderFeed();
    renderTrending();
    renderOnlineUsers();
  }

  // ── Init ───────────────────────────────────────────────────
  function init() {
    Auth.init();
    renderAll();

    // Sort tabs
    document.querySelectorAll(".sort-tab").forEach((btn) => {
      btn.addEventListener("click", () => setSort(btn.dataset.sort));
    });

    // Forum search
    const searchInput = document.getElementById("forum-search-input");
    let debounce = null;
    searchInput?.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => doSearch(searchInput.value), 350);
    });
    document
      .getElementById("forum-search-btn")
      ?.addEventListener("click", () => {
        doSearch(searchInput?.value);
      });

    // Create post button
    document
      .getElementById("btn-new-post")
      ?.addEventListener("click", openCreateModal);
    document
      .getElementById("modal-close-btn")
      ?.addEventListener("click", closeCreateModal);

    // Close modal on backdrop click
    document
      .getElementById("create-post-modal")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "create-post-modal") closeCreateModal();
      });

    // Image upload
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

    // Tags input
    const tagInput = document.getElementById("tag-input");
    tagInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput.value);
      }
      if (e.key === "Backspace" && !tagInput.value && state.tags.length) {
        removeTagChip(state.tags[state.tags.length - 1]);
      }
    });
    tagInput?.addEventListener("blur", () => {
      if (tagInput.value) addTag(tagInput.value);
    });

    // Category selector
    document.querySelectorAll(".cat-select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".cat-select-btn")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.selectedCategory = btn.dataset.cat;
      });
    });

    // Submit
    document
      .getElementById("post-submit-btn")
      ?.addEventListener("click", submitPost);

    // Textarea char count
    const textarea = document.getElementById("post-textarea");
    const charCount = document.getElementById("post-char-count");
    textarea?.addEventListener("input", () => {
      if (charCount) charCount.textContent = `${textarea.value.length}/2000`;
      if (textarea.value.length > 2000)
        textarea.value = textarea.value.slice(0, 2000);
    });

    // Lightbox
    document
      .getElementById("lightbox-close")
      ?.addEventListener("click", closeLightbox);
    document.getElementById("lightbox")?.addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });

    // Close menus on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".post-card-menu")) closeAllMenus();
    });

    // Escape key
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

document.addEventListener("DOMContentLoaded", Forum.init);
    