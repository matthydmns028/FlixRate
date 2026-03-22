// ============================================================
// FlixRate – Friends Module (FIREBASE VERSION)
// ============================================================

import { auth, db } from "./firebase-init.js";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const Friends = (() => {
  // Cloud Accessors
  function getFriends() {
    return window.cloudProfile?.friends || [];
  }
  function getSentReqs() {
    return window.cloudProfile?.sentReqs || [];
  }
  function getIncoming() {
    return window.cloudProfile?.incomingReqs || [];
  }
  function getFollowers() {
    return window.cloudProfile?.followers || [];
  }
  function getFollowing() {
    return window.cloudProfile?.following || [];
  }

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

  // 🟨 FIREBASE: Find Users in the Database
  async function findUsers(queryStr) {
    try {
      const snap = await getDocs(collection(db, "users"));
      const myUsername = window.Auth.getSession()?.username;

      let users = snap.docs
        .map((d) => d.data().username)
        .filter((u) => u && u !== myUsername);
      if (queryStr) {
        const q = queryStr.toLowerCase();
        users = users.filter((u) => u.toLowerCase().includes(q));
      }
      return users.slice(0, 20);
    } catch (e) {
      console.error("Error finding users:", e);
      return [];
    }
  }

  function getStatus(username) {
    if (getFriends().includes(username)) return "friends";
    if (getSentReqs().includes(username)) return "pending";
    if (getIncoming().includes(username)) return "incoming";
    return "none";
  }

  // 🟨 FIREBASE: Send Friend Request
  async function sendRequest(toUsername) {
    const sent = getSentReqs();
    if (sent.includes(toUsername)) return;

    sent.push(toUsername);
    window.cloudProfile.sentReqs = sent;
    await window.saveCloudProfile(); // Update my doc

    try {
      // Update their doc
      const q = query(
        collection(db, "users"),
        where("username", "==", toUsername),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const incoming = otherData.incomingReqs || [];
        if (!incoming.includes(window.cloudProfile.username)) {
          incoming.push(window.cloudProfile.username);
          await updateDoc(doc(db, "users", otherId), {
            incomingReqs: incoming,
          });
        }
      }
    } catch (e) {
      console.error("Error sending friend request:", e);
    }

    renderAll();
    showProfileToast(`Friend request sent to @${toUsername}! 👋`);
  }

  // 🟨 FIREBASE: Cancel Friend Request
  async function cancelRequest(toUsername) {
    window.cloudProfile.sentReqs = getSentReqs().filter(
      (u) => u !== toUsername,
    );
    await window.saveCloudProfile();

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", toUsername),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const incoming = (otherData.incomingReqs || []).filter(
          (u) => u !== window.cloudProfile.username,
        );
        await updateDoc(doc(db, "users", otherId), { incomingReqs: incoming });
      }
    } catch (e) {
      console.error(e);
    }

    renderAll();
    showProfileToast("Request cancelled.");
  }

  // 🟨 FIREBASE: Accept Friend Request
  async function acceptRequest(fromUsername) {
    window.cloudProfile.incomingReqs = getIncoming().filter(
      (u) => u !== fromUsername,
    );
    if (!window.cloudProfile.friends.includes(fromUsername))
      window.cloudProfile.friends.push(fromUsername);
    await window.saveCloudProfile();

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", fromUsername),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const sent = (otherData.sentReqs || []).filter(
          (u) => u !== window.cloudProfile.username,
        );
        const friends = otherData.friends || [];
        if (!friends.includes(window.cloudProfile.username))
          friends.push(window.cloudProfile.username);
        await updateDoc(doc(db, "users", otherId), {
          sentReqs: sent,
          friends: friends,
        });
      }
    } catch (e) {
      console.error(e);
    }

    renderAll();
    showProfileToast(`You and @${fromUsername} are now friends! 🎉`);
  }

  // 🟨 FIREBASE: Decline Friend Request
  async function declineRequest(fromUsername) {
    window.cloudProfile.incomingReqs = getIncoming().filter(
      (u) => u !== fromUsername,
    );
    await window.saveCloudProfile();

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", fromUsername),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const sent = (otherData.sentReqs || []).filter(
          (u) => u !== window.cloudProfile.username,
        );
        await updateDoc(doc(db, "users", otherId), { sentReqs: sent });
      }
    } catch (e) {
      console.error(e);
    }

    renderAll();
    showProfileToast("Request declined.");
  }

  // 🟨 FIREBASE: Remove Friend
  async function removeFriend(username) {
    if (!confirm(`Remove @${username} from your friends?`)) return;

    window.cloudProfile.friends = getFriends().filter((u) => u !== username);
    await window.saveCloudProfile();

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", username),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const friends = (otherData.friends || []).filter(
          (u) => u !== window.cloudProfile.username,
        );
        await updateDoc(doc(db, "users", otherId), { friends: friends });
      }
    } catch (e) {
      console.error(e);
    }

    renderAll();
    showProfileToast(`@${username} removed from friends.`);
  }

  // 🟨 FIREBASE: Follow User
  async function follow(toUsername) {
    const following = getFollowing();
    if (following.includes(toUsername)) return;

    following.push(toUsername);
    window.cloudProfile.following = following;
    await window.saveCloudProfile();

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", toUsername),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const followers = otherData.followers || [];
        if (!followers.includes(window.cloudProfile.username)) {
          followers.push(window.cloudProfile.username);
          await updateDoc(doc(db, "users", otherId), { followers: followers });
        }
      }
    } catch (e) {
      console.error(e);
    }

    renderAll();
    showProfileToast(`You are now following @${toUsername}!`);
  }

  // 🟨 FIREBASE: Unfollow User
  async function unfollow(toUsername) {
    if (!confirm(`Unfollow @${toUsername}?`)) return;

    window.cloudProfile.following = getFollowing().filter(
      (u) => u !== toUsername,
    );
    await window.saveCloudProfile();

    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", toUsername),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const otherId = snap.docs[0].id;
        const otherData = snap.docs[0].data();
        const followers = (otherData.followers || []).filter(
          (u) => u !== window.cloudProfile.username,
        );
        await updateDoc(doc(db, "users", otherId), { followers: followers });
      }
    } catch (e) {
      console.error(e);
    }

    renderAll();
    showProfileToast(`Unfollowed @${toUsername}.`);
  }

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

  function renderFriendCard(username, mode) {
    const status = getStatus(username);
    let actionHtml = "";
    if (mode === "incoming") {
      actionHtml = `<div class="friend-request-btns"><button class="friend-btn-accept" onclick="window.Friends.accept('${esc(username)}')">✓ Accept</button><button class="friend-btn-decline" onclick="window.Friends.decline('${esc(username)}')">✕</button></div>`;
    } else if (mode === "friend") {
      actionHtml = `<button class="friend-action-btn friend-btn-friends" onclick="window.Friends.remove('${esc(username)}')" title="Remove friend">✓ Friends</button>`;
    } else {
      if (status === "friends")
        actionHtml = `<button class="friend-action-btn friend-btn-friends" onclick="window.Friends.remove('${esc(username)}')" title="Remove friend">✓ Friends</button>`;
      else if (status === "pending")
        actionHtml = `<button class="friend-action-btn friend-btn-pending" onclick="window.Friends.cancel('${esc(username)}')">Pending ✕</button>`;
      else if (status === "incoming")
        actionHtml = `<div class="friend-request-btns"><button class="friend-btn-accept" onclick="window.Friends.accept('${esc(username)}')">✓</button><button class="friend-btn-decline" onclick="window.Friends.decline('${esc(username)}')">✕</button></div>`;
      else
        actionHtml = `<button class="friend-action-btn friend-btn-add" onclick="window.Friends.send('${esc(username)}')">+ Add</button>`;
    }

    return `
      <div class="friend-card">
        <div class="friend-avatar" style="background:${avatarColor(username)}; cursor:pointer;" onclick="window.location.href='profile.html?u=${encodeURIComponent(username)}'">${avatarLetter(username)}<span class="friend-online-dot dot-offline"></span></div>
        <div class="friend-info">
          <div class="friend-name"><span style="cursor:pointer;" onclick="window.location.href='profile.html?u=${encodeURIComponent(username)}'" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${esc(username)}</span></div>
          <div class="friend-meta">${mode === "friend" ? "👥 Friend" : mode === "incoming" ? "📩 Sent you a request" : "🔍 FlixRate user"}</div>
        </div>
        ${actionHtml}
      </div>`;
  }

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
    if (badge) {
      badge.textContent = count;
      badge.style.display = count ? "flex" : "none";
    }
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
          <div class="friend-avatar" style="background:${avatarColor(u)}; cursor:pointer;" onclick="window.location.href='profile.html?u=${encodeURIComponent(u)}'">${avatarLetter(u)}</div>
          <div class="friend-info"><div class="friend-name"><span style="cursor:pointer;" onclick="window.location.href='profile.html?u=${encodeURIComponent(u)}'" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${esc(u)}</span></div><div class="friend-meta">📤 Awaiting response</div></div>
          <button class="friend-action-btn friend-btn-pending" onclick="window.Friends.cancel('${esc(u)}')">Pending ✕</button>
        </div>`,
        )
        .join('<div class="friends-divider"></div>');
    }
    if (!incoming.length && !sent.length) {
      html = `<div class="friends-empty"><div class="friends-empty-icon">📩</div>No pending requests.</div>`;
    }
    body.innerHTML = html;
  }

  async function renderFind(query) {
    const body = document.getElementById("friends-drawer-body");
    if (!body) return;

    body.innerHTML = `<div class="friends-empty" style="opacity:0.6">Searching community...</div>`;

    const users = await findUsers(query);
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

  function switchTab(tabId) {
    activeTab = tabId;
    document
      .querySelectorAll(".friends-tab")
      .forEach((t) => t.classList.toggle("active", t.dataset.ftab === tabId));
    const searchWrap = document.getElementById("friends-search-wrap");
    if (searchWrap)
      searchWrap.style.display = tabId === "find" ? "block" : "none";
    renderAll();
  }

  function init() {
    renderBadge();

    // Tabs
    document
      .querySelectorAll(".friends-tab")
      .forEach((t) =>
        t.addEventListener("click", () => switchTab(t.dataset.ftab)),
      );

    // Search
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
    switchTab,
    send: sendRequest,
    cancel: cancelRequest,
    accept: acceptRequest,
    decline: declineRequest,
    remove: removeFriend,
    follow,
    unfollow,
  };
})();

// CRITICAL: Bind to window so HTML onClick attributes can access it!
window.Friends = Friends;

// 🟨 THE FIX: Bulletproof Event Delegator for the UI
// This guarantees the drawer opens/closes no matter when the scripts load
document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-friends")) {
    window.Friends.open();
  }
  if (
    e.target.closest("#friends-head-close") ||
    e.target.id === "friends-backdrop"
  ) {
    window.Friends.close();
  }
});
