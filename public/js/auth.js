/**
 * auth.js — FitForge Authentication & Session Controller
 *
 * Handles JWT token storage, athlete/coach user state, and modal helpers.
 */

const Auth = (() => {
  const TOKEN_KEY = "fitforge_token";
  const USER_KEY  = "fitforge_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setUser(user) {
    const safe = {
      id:        user.id || user._id,
      firstName: user.firstName || (user.name ? user.name.split(" ")[0] : ""),
      lastName:  user.lastName || (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
      name:      user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email:     user.email,
      phone:     user.phone || null,
      role:      user.role || "customer",
    };
    localStorage.setItem(USER_KEY, JSON.stringify(safe));
  }

  function removeUser() {
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function isCustomer() {
    const user = getUser();
    return user && user.role === "customer";
  }

  function isAdmin() {
    const user = getUser();
    return user && user.role === "admin";
  }

  function isCoach() {
    const user = getUser();
    return user && (user.role === "coach" || user.role === "admin");
  }

  function saveSession(tokenOrData, maybeUser) {
    if (typeof tokenOrData === "string") {
      setToken(tokenOrData);
      if (maybeUser) setUser(maybeUser);
    } else if (tokenOrData && typeof tokenOrData === "object") {
      if (tokenOrData.token) setToken(tokenOrData.token);
      if (tokenOrData.user)  setUser(tokenOrData.user);
    }
  }

  function clearSession() {
    removeToken();
    removeUser();
  }

  function logout() {
    clearSession();
    window.location.href = "/";
  }

  function requireCustomer(redirectTo) {
    if (!isLoggedIn() || !isCustomer()) {
      if (redirectTo) {
        sessionStorage.setItem("fitforge_after_login", redirectTo);
      }
      window.location.href = "/";
      return false;
    }
    return true;
  }

  function consumeRedirect() {
    const dest = sessionStorage.getItem("fitforge_after_login");
    if (dest) sessionStorage.removeItem("fitforge_after_login");
    return dest;
  }

  function isTokenExpired() {
    const token = getToken();
    if (!token) return true;
    if (token.startsWith("fitforge-token-") || token.startsWith("local-token-")) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Date.now() / 1000 > payload.exp;
    } catch {
      return false;
    }
  }

  function checkSession() {
    if (!isLoggedIn()) return false;
    if (isTokenExpired()) {
      clearSession();
      return false;
    }
    return true;
  }

  function openModal(tab = "login") {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("active");
    switchTab(tab);
  }

  function closeModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("active");
  }

  function switchTab(tab) {
    const formLogin = document.getElementById("form-login");
    const formReg = document.getElementById("form-register");
    if (tab === "login") {
      if (formLogin) formLogin.style.display = "block";
      if (formReg) formReg.style.display = "none";
    } else {
      if (formLogin) formLogin.style.display = "none";
      if (formReg) formReg.style.display = "block";
    }
  }

  return {
    getToken,
    setToken,
    getUser,
    setUser,
    isLoggedIn,
    isCustomer,
    isAdmin,
    isCoach,
    saveSession,
    clearSession,
    logout,
    requireCustomer,
    consumeRedirect,
    checkSession,
    openModal,
    closeModal,
    switchTab,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Auth;
}
