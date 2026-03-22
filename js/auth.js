// ============================================================
// FlixRate – Authentication Module
// Uses localStorage to persist users and sessions
// ============================================================

const Auth = (() => {
  const USERS_KEY = "flixrate_users";
  const SESSION_KEY = "flixrate_session";

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  }

  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function register(username, email, password) {
    const users = getUsers();
    if (users.find((u) => u.email === email)) {
      return { success: false, message: "Email already registered." };
    }
    if (users.find((u) => u.username === username)) {
      return { success: false, message: "Username already taken." };
    }
    const user = {
      id: Date.now(),
      username,
      email,
      password,
      avatar: null,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    saveSession({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });
    return { success: true, user };
  }

  function login(credential, password) {
    const users = getUsers();
    // Check if credential is an email (contains @) or a username
    const isEmail = credential.includes("@");
    let user;

    if (isEmail) {
      user = users.find(
        (u) => u.email === credential && u.password === password,
      );
    } else {
      user = users.find(
        (u) => u.username === credential && u.password === password,
      );
    }

    if (!user) {
      return { success: false, message: "Invalid email/username or password." };
    }
    saveSession({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });
    return { success: true, user };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    updateNavbar();
  }

  function confirmLogout() {
    // Inject modal once
    if (!document.getElementById("logout-confirm-modal")) {
      const modal = document.createElement("div");
      modal.id = "logout-confirm-modal";
      modal.className = "logout-modal-backdrop";
      modal.innerHTML = `
        <div class="logout-modal-box">
          <div class="logout-modal-icon">👋</div>
          <h3 class="logout-modal-title">Sign out?</h3>
          <p class="logout-modal-sub">You'll need to sign back in to access your profile and activity.</p>
          <div class="logout-modal-actions">
            <button class="logout-btn-cancel" onclick="Auth.hideLogoutModal()">Cancel</button>
            <button class="logout-btn-confirm" onclick="Auth.doLogout()">Sign Out</button>
          </div>
        </div>`;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) Auth.hideLogoutModal();
      });
      document.body.appendChild(modal);
    }
    document.getElementById("logout-confirm-modal").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function hideLogoutModal() {
    document.getElementById("logout-confirm-modal")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function doLogout() {
    hideLogoutModal();
    logout();
    window.location.reload();
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function updateNavbar() {
    const session = getSession();
    const navUser = document.getElementById("nav-user-area");
    if (!navUser) return;
    if (session) {
      const avatarData = localStorage.getItem("flixrate_profile_avatar");
      navUser.innerHTML = `
        <div class="nav-user-info">
          <a href="profile.html" class="nav-user-link" title="View profile">
            <div class="nav-avatar-wrap">
              ${
                avatarData
                  ? `<img src="${avatarData}" alt="avatar" class="nav-avatar-img">`
                  : `<div class="nav-avatar-placeholder">${session.username.charAt(0).toUpperCase()}</div>`
              }
            </div>
            <div class="nav-user-text">
              <span class="nav-username">${session.username}</span>
              <span class="nav-uid">ID:${session.id.toString().slice(-8)}</span>
            </div>
          </a>
          <button class="nav-logout-btn" onclick="event.stopPropagation();Auth.confirmLogout()" title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>`;

      // Initialize notifications
      import("./notifications.js")
        .then((mod) => {
          if (mod.default) mod.default.init();
        })
        .catch((err) =>
          console.error("Could not load notifications module:", err),
        );
    } else {
      navUser.innerHTML = `
        <a href="login.html" class="nav-login-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Sign In
        </a>`;
    }
  }

  function init() {
    updateNavbar();
  }

  function updateSession(updates) {
    let session = getSession();
    if (session) {
      session = { ...session, ...updates };
      saveSession(session);
      updateNavbar();
    }
  }

  // Firebase reset password
  async function resetPassword(email) {
    try {
      const { sendPasswordResetEmail } =
        await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js");
      const { auth } = await import("./firebase-init.js");

      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: "Check your inbox! A secure reset link has been sent.",
      };
    } catch (error) {
      let msg = error.message;
      if (error.code === "auth/user-not-found")
        msg = "No user found with this email.";
      if (error.code === "auth/invalid-email") msg = "Invalid email address.";
      return { success: false, message: msg };
    }
  }

  return {
    register,
    login,
    logout,
    resetPassword,
    confirmLogout,
    hideLogoutModal,
    doLogout,
    isLoggedIn,
    getSession,
    updateSession,
    updateNavbar,
    init,
  };
})();

window.Auth = Auth;
