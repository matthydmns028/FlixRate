// ============================================================
// FlixRate – Custom Context Menu
// Right-click any media card for quick actions
// ============================================================
import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const ContextMenu = (() => {
  let menuEl = null;

  async function getCloudWL() {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session) return {};
    try {
      const userRef = doc(db, "users", String(session.id));
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const wl = data.watchlist || {};
        localStorage.setItem("flixrate_wishlist", JSON.stringify(wl));
        return wl;
      }
    } catch (e) {
      console.error("WL fetch error", e);
    }
    return JSON.parse(localStorage.getItem("flixrate_wishlist") || "{}");
  }

  async function getCloudHighlights() {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session) return new Array(5).fill(null);
    try {
      const userRef = doc(db, "users", String(session.id));
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        let hl = data.highlights;
        if (!hl || !Array.isArray(hl) || hl.length < 5) {
          hl = new Array(5).fill(null);
        }
        localStorage.setItem("flixrate_profile_highlights", JSON.stringify(hl));
        return hl;
      }
    } catch (e) {
      console.error("Highlights fetch error", e);
    }
    const local = JSON.parse(
      localStorage.getItem("flixrate_profile_highlights") || "null",
    );
    return local || new Array(5).fill(null);
  }

  async function saveCloudWL(newWL) {
    const session = window.Auth ? window.Auth.getSession() : null;
    localStorage.setItem("flixrate_wishlist", JSON.stringify(newWL));
    if (!session) return;
    try {
      const userRef = doc(db, "users", String(session.id));
      await setDoc(userRef, { watchlist: newWL }, { merge: true });
    } catch (e) {
      console.error("WL save error", e);
    }
  }

  async function saveCloudHighlights(newHL) {
    const session = window.Auth ? window.Auth.getSession() : null;
    localStorage.setItem("flixrate_profile_highlights", JSON.stringify(newHL));
    if (!session) return;
    try {
      const userRef = doc(db, "users", String(session.id));
      await setDoc(userRef, { highlights: newHL }, { merge: true });
    } catch (e) {
      console.error("Highlights save error", e);
    }
  }

  let current = null; // { id, type, title, poster, year, rating }
  let hideTimeout = null; // Prevent immediate hiding after show()

  // Define menu click handler once at module level
  const onMenuClick = (ev) => {
    console.log(
      "📍 Menu click event fired. Target:",
      ev.target,
      "Event:",
      ev.type,
    );
    const btn = ev.target.closest(".ctx-item");
    console.log(
      "📍 Closest .ctx-item button:",
      btn,
      "Data-action:",
      btn?.dataset?.action,
    );
    if (btn) {
      console.log("📍 Button action to handle:", btn.dataset.action);
      ev.stopPropagation();
      ev.preventDefault();
      handleAction(btn.dataset.action);
    }
  };

  // ── Build DOM once ─────────────────────────────────────────
  function ensureMenu() {
    if (menuEl) {
      console.log("📍 Menu already exists");
      return;
    }
    console.log("📍 Creating new menu element...");
    menuEl = document.createElement("div");
    menuEl.id = "ctx-menu";
    menuEl.className = "ctx-menu";
    document.body.appendChild(menuEl);
    console.log("📍 Menu appended to body:", menuEl);

    // Attach the click handler to the menu element (persists even after innerHTML changes)
    menuEl.addEventListener("click", onMenuClick, true);

    // Close on outside click / scroll, but with debounce to prevent immediate hiding
    document.addEventListener("click", (clickEvent) => {
      console.log(
        "📍 Click detected. hideTimeout:",
        hideTimeout,
        "menuEl hidden?",
        menuEl.className === "ctx-menu",
      );
      // Only hide if we're not in the immediate show() time window
      if (!hideTimeout) {
        console.log(
          "📍 Not in debounce window - checking if click is outside menu",
        );
        // Only hide if click is outside the menu
        if (menuEl && !menuEl.contains(clickEvent.target)) {
          console.log("📍 Click outside menu, hiding");
          hide();
        } else {
          console.log("📍 Click inside menu or menu not found, not hiding");
        }
      } else {
        console.log("📍 Still in debounce window, ignoring click");
      }
    });
    document.addEventListener("scroll", () => hide(), { passive: true });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide();
    });
  }

  // ── Show ───────────────────────────────────────────────────
  async function show(e, item) {
    console.log("📍 show() called with item:", item);
    // Note: preventDefault already called in initGlobal before show() is called
    console.log("📍 Event defaultPrevented:", e.defaultPrevented);
    ensureMenu();
    console.log("📍 Menu element created/found:", menuEl);
    console.log("📍 menuEl in DOM?", document.body.contains(menuEl));
    current = item;

    let WL = JSON.parse(localStorage.getItem("flixrate_wishlist") || "{}");
    const session = window.Auth ? window.Auth.getSession() : null;
    if (session) {
      WL = await getCloudWL();
    }
    const wlKey = `${item.type}_${item.id}`;
    const inWL = !!(WL[wlKey] && typeof WL[wlKey] === "object");
    console.log("📍 Session:", session, "InWL:", inWL);

    // Build action list
    const actions = [
      { icon: "🎬", label: "View Details", id: "detail", cls: "primary" },
      { divider: true },
    ];

    if (session) {
      actions.push(
        inWL
          ? {
              icon: "✅",
              label: "In Watchlist — Remove",
              id: "watchlist-remove",
              cls: "success",
            }
          : { icon: "🔖", label: "Add to Watchlist", id: "watchlist-add" },
      );
      actions.push({ icon: "🌟", label: "Add to Highlights", id: "highlight" });
    } else {
      actions.push({
        icon: "🔖",
        label: "Add to Watchlist",
        id: "login",
        hint: "Login required",
      });
      actions.push({
        icon: "🌟",
        label: "Add to Highlights",
        id: "login",
        hint: "Login required",
      });
    }

    actions.push({ divider: true });
    actions.push({ icon: "📋", label: "Copy Title", id: "copy" });

    console.log("📍 Building menu HTML...");
    menuEl.innerHTML = `
      <div class="ctx-header">
        <span class="ctx-header-type">${item.type === "anime" ? "🎌" : item.type === "tv" ? "📺" : "🎬"} ${capitalize(item.type)}</span>
        <span class="ctx-header-title">${esc(item.title)}</span>
      </div>
      ${actions
        .map((a) => {
          if (a.divider) return '<div class="ctx-divider"></div>';
          return `<button class="ctx-item${a.cls ? " ctx-item--" + a.cls : ""}" data-action="${a.id}">
          <span class="ctx-icon">${a.icon}</span>
          <span class="ctx-label">${a.label}</span>
          ${a.hint ? `<span class="ctx-hint">${a.hint}</span>` : ""}
        </button>`;
        })
        .join("")}`;

    console.log("📍 Menu HTML set. Adding ctx-menu--open class...");
    // Note: Menu click handler (onMenuClick) is already attached in ensureMenu()
    // and persists even after innerHTML changes

    // Position — open first so we can measure, then clamp
    menuEl.className = "ctx-menu ctx-menu--open";
    menuEl.style.opacity = "1";
    menuEl.style.pointerEvents = "all";
    menuEl.style.transform = "scale(1) translateY(0)";
    console.log("📍 Menu visible. Class set to:", menuEl.className);
    console.log("📍 classList:", menuEl.classList);
    console.log(
      "📍 Computed styles - opacity:",
      getComputedStyle(menuEl).opacity,
      "pointer-events:",
      getComputedStyle(menuEl).pointerEvents,
    );
    console.log(
      "📍 Menu getBoundingClientRect:",
      menuEl.getBoundingClientRect(),
    );
    console.log("📍 Menu display:", getComputedStyle(menuEl).display);
    console.log("📍 Menu visibility:", getComputedStyle(menuEl).visibility);
    console.log("📍 Menu inDOM:", document.body.contains(menuEl));
    console.log(
      "📍 Menu parentNode:",
      menuEl.parentNode === document.body ? "body" : "other",
    );

    requestAnimationFrame(() => {
      const mw = menuEl.offsetWidth || 220;
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
      menuEl.style.top = `${y + window.scrollY}px`;
      console.log("📍 Menu positioned at:", x, y);
      console.log(
        "📍 After positioning - getBoundingClientRect:",
        menuEl.getBoundingClientRect(),
      );
    });

    // Set debounce flag SYNCHRONOUSLY to prevent immediate hide from click event
    // This must happen before any click event can fire
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      hideTimeout = null;
      console.log("📍 Debounce cleared - clicks will now hide menu");
    }, 200);
  }

  // ── Hide ───────────────────────────────────────────────────
  function hide() {
    if (!menuEl) return;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    menuEl.className = "ctx-menu";
    // Reset styles to hidden state
    menuEl.style.opacity = "0";
    menuEl.style.pointerEvents = "none";
    menuEl.style.transform = "scale(0.92) translateY(-6px)";
    current = null;
    console.log("📍 Menu hidden");
  }

  // ── Handle actions ─────────────────────────────────────────
  async function handleAction(action) {
    if (!current) return;
    const { id, type, title, poster, year, rating } = current;
    hide();

    if (action === "detail") {
      window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
    } else if (action === "watchlist-add") {
      const WL = await getCloudWL();
      const key = `${type}_${id}`;
      WL[key] = {
        id,
        type,
        title,
        poster: poster || null,
        year: year || "",
        rating: rating || null,
        addedAt: Date.now(),
      };
      await saveCloudWL(WL);
      toast("Added to Watchlist 🔖");
    } else if (action === "watchlist-remove") {
      const WL = await getCloudWL();
      const key = `${type}_${id}`;
      delete WL[key];
      await saveCloudWL(WL);
      toast("Removed from Watchlist");
    } else if (action === "highlight") {
      const h = await getCloudHighlights();
      if (h.some((s) => s && s.id === id && s.type === type)) {
        toast("Already in your highlights!");
        return;
      }
      const emptyIdx = h.findIndex((s) => !s);
      if (emptyIdx === -1) {
        toast("Highlights full! Remove one from your profile.");
        return;
      }
      h[emptyIdx] = {
        id,
        type,
        title,
        poster: poster || null,
        year: year || "",
        rating: rating || null,
      };
      await saveCloudHighlights(h);
      toast(`Added "${title}" to Highlights 🌟`);
    } else if (action === "copy") {
      navigator.clipboard
        ?.writeText(title)
        .then(() => toast("Title copied! 📋"))
        .catch(() => toast("Copy not supported"));
    } else if (action === "login") {
      window.location.href = "login.html";
    }
  }

  // ── Toast ──────────────────────────────────────────────────
  function toast(msg) {
    console.log("📍 Toast showing:", msg);
    const t = document.createElement("div");
    t.className = "ctx-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    console.log("📍 Toast element added to DOM");
    // Animate in
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        console.log("📍 Adding show class to toast");
        t.classList.add("show");
      }),
    );
    setTimeout(() => {
      console.log("📍 Removing show class from toast");
      t.classList.remove("show");
      setTimeout(() => {
        console.log("📍 Removing toast from DOM");
        t.remove();
      }, 350);
    }, 2600);
  }

  // ── Helpers ────────────────────────────────────────────────
  function esc(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : "";
  }

  // ── Global listener on document ────────────────────────────
  // Reads data-ctx-id / data-ctx-type / data-ctx-title / data-ctx-poster / data-ctx-year / data-ctx-rating
  // from any card element in the bubble path
  function initGlobal() {
    document.addEventListener("contextmenu", (e) => {
      console.log("Context menu right-click detected on:", e.target);
      const card = e.target.closest("[data-ctx-id]");
      console.log("Searching for [data-ctx-id] element...");
      if (!card) {
        console.log("No card found with [data-ctx-id]");
        return;
      }
      console.log("Card found with data-ctx-id:", card.dataset.ctxId);
      // Be aggressive about preventing browser's context menu
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      show(e, {
        id: card.dataset.ctxId,
        type: card.dataset.ctxType || "movie",
        title: card.dataset.ctxTitle || "Unknown",
        poster: card.dataset.ctxPoster || null,
        year: card.dataset.ctxYear || "",
        rating: card.dataset.ctxRating || null,
      });
    });
  }

  return { show, hide, initGlobal, toast };
})();

// Boot immediately — works on every page that includes this script
ContextMenu.initGlobal();

window.ContextMenu = ContextMenu;
