// js/notifications.js
import { db } from "./firebase-init.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const Notifications = (() => {
  let unsubscribe = null;
  let notificationsList = [];

  function init() {
    // Only init if user is logged in
    const session = window.Auth?.getSession();
    if (!session) return;

    listenToNotifications(session.id);
  }

  function listenToNotifications(userId) {
    if (unsubscribe) unsubscribe();

    const notificationsRef = collection(
      db,
      "users",
      userId.toString(),
      "notifications",
    );
    // Sort by descending timestamp
    const q = query(notificationsRef, orderBy("timestamp", "desc"));

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        notificationsList = [];
        let unreadCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          notificationsList.push({ id: doc.id, ...data });
          if (!data.read) unreadCount++;
        });

        updateUI(unreadCount);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
      },
    );
  }

  function updateUI(unreadCount) {
    // Update badge
    const badge = document.getElementById("nav-notif-badge");
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }

    // Update lists (both navbar and profile page if they exist)
    const listContainers = [
      document.getElementById("nav-notif-list"),
      document.getElementById("profile-notif-list"),
    ].filter(Boolean);

    listContainers.forEach((list) => {
      if (notificationsList.length === 0) {
        list.innerHTML = `<div class="notification-empty" style="padding:40px 16px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet. You're all caught up!</div>`;
        return;
      }

      list.innerHTML = "";
      // Show top 30 notifications max
      notificationsList.slice(0, 30).forEach((notif) => {
        const el = document.createElement("div");
        el.className = `notification-item ${notif.read ? "" : "unread"}`;

        // Determine icon based on type
        let icon = "🔔";
        if (notif.type === "friend_request") icon = "👤";
        if (notif.type === "comment") icon = "💬";
        if (notif.type === "like") icon = "❤️";
        if (notif.type === "system") icon = "⚡";
        if (notif.type === "movie_update") icon = "🎬";

        // Format time safely
        let timeString = "Just now";
        if (notif.timestamp && notif.timestamp.toDate) {
          const date = notif.timestamp.toDate();
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffMins < 1) timeString = "Just now";
          else if (diffMins < 60) timeString = `${diffMins}m ago`;
          else if (diffHours < 24) timeString = `${diffHours}h ago`;
          else if (diffDays < 7) timeString = `${diffDays}d ago`;
          else timeString = date.toLocaleDateString();
        }

        el.innerHTML = `
          <div class="notification-icon">${icon}</div>
          <div class="notification-content">
            <p class="notification-title">${notif.message}</p>
            <span class="notification-time">${timeString}</span>
          </div>
        `;

        el.addEventListener("click", (e) => {
          // Only trigger link if not clicking purely for marking read
          if (!notif.read) markAsRead(notif.id);
          if (notif.link) {
            window.location.href = notif.link;
          }
        });

        list.appendChild(el);
      });
    });
  }

  async function markAsRead(notifId) {
    const session = window.Auth?.getSession();
    if (!session) return;
    try {
      const notifRef = doc(
        db,
        "users",
        session.id.toString(),
        "notifications",
        notifId,
      );
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  }

  async function markAllAsRead() {
    const session = window.Auth?.getSession();
    if (!session) return;
    try {
      const batch = writeBatch(db);
      let count = 0;
      notificationsList.forEach((notif) => {
        if (!notif.read) {
          const notifRef = doc(
            db,
            "users",
            session.id.toString(),
            "notifications",
            notif.id,
          );
          batch.update(notifRef, { read: true });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  }

  // Create a helper method to push a new notification (useful for testing or other modules)
  async function testAddNotification(message, type = "system", link = "") {
    const session = window.Auth?.getSession();
    if (!session) return;
    try {
      const { addDoc, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js");
      const ref = collection(
        db,
        "users",
        session.id.toString(),
        "notifications",
      );
      await addDoc(ref, {
        message,
        type,
        link,
        read: false,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to add test notification:", e);
    }
  }

  return { init, testAddNotification, markAllAsRead };
})();

// Assign to window for easy demo and access
window.Notifications = Notifications;

export default Notifications;
