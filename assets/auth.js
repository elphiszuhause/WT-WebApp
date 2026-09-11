(function () {
  "use strict";

  const SUPABASE_URL = "https://lvtcxdiyixblbufvxghy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_MHbZSrecBpTgBsrwgjATSQ_vdk0v3wJ";
  const SESSION_KEY = "wt-auth-session";
  const APP_ROOT_URL = new URL("../", document.currentScript.src);

  document.documentElement.classList.add("auth-pending");

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (_) {
      return null;
    }
  }

  function saveSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function tokenExpiresSoon(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return !payload.exp || payload.exp * 1000 < Date.now() + 60000;
    } catch (_) {
      return true;
    }
  }

  async function authRequest(path, options) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        ...(options && options.headers)
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.msg || data.message || data.error_description || "Anmeldung fehlgeschlagen");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function refreshSession(session) {
    if (!session || !session.refresh_token) return null;
    try {
      const refreshed = await authRequest("token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      saveSession(refreshed);
      return refreshed;
    } catch (_) {
      saveSession(null);
      return null;
    }
  }

  async function getValidSession() {
    let session = readSession();
    if (!session || !session.access_token) return null;
    if (tokenExpiresSoon(session.access_token)) session = await refreshSession(session);
    if (!session) return null;

    if (!navigator.onLine) return session;
    try {
      const user = await authRequest("user", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      session.user = user;
      saveSession(session);
      return session;
    } catch (error) {
      if (error.status === 401) return refreshSession(session);
      return session;
    }
  }

  function loginUrl() {
    const url = new URL("login", APP_ROOT_URL);
    url.searchParams.set("return", window.location.href);
    return url.href;
  }

  function safeReturnUrl() {
    const requested = new URLSearchParams(window.location.search).get("return");
    if (!requested) return APP_ROOT_URL.href;
    try {
      const url = new URL(requested, APP_ROOT_URL);
      return url.origin === APP_ROOT_URL.origin && url.href.startsWith(APP_ROOT_URL.href)
        ? url.href
        : APP_ROOT_URL.href;
    } catch (_) {
      return APP_ROOT_URL.href;
    }
  }

  function showPage() {
    document.documentElement.classList.remove("auth-pending");
    document.body.removeAttribute("data-auth-protected");
  }

  function readableError(error) {
    const message = String(error && error.message || "").toLowerCase();
    if (message.includes("invalid login credentials")) return "E-Mail-Adresse oder Passwort stimmen nicht.";
    if (message.includes("email not confirmed")) return "Das Benutzerkonto wurde noch nicht bestätigt.";
    if (message.includes("failed to fetch") || !navigator.onLine) return "Keine Verbindung. Bitte prüfe die Internetverbindung.";
    return "Die Anmeldung ist gerade nicht möglich. Bitte versuche es erneut.";
  }

  function readAuthCallback() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription = params.get("error_description");
    if (errorDescription) {
      history.replaceState({}, document.title, window.location.pathname);
      return { error: new Error(errorDescription) };
    }
    if (!params.get("access_token") || !params.get("refresh_token")) return null;

    const session = {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      token_type: params.get("token_type") || "bearer",
      expires_in: Number(params.get("expires_in") || 3600),
      expires_at: Number(params.get("expires_at") || 0)
    };
    saveSession(session);
    const type = params.get("type") || "";
    history.replaceState({}, document.title, window.location.pathname);
    return { session, type };
  }

  function initPasswordSetup(session) {
    const loginIntro = document.getElementById("login-intro");
    const loginForm = document.getElementById("login-form");
    const loginHelp = document.getElementById("login-help");
    const setupIntro = document.getElementById("password-intro");
    const setupForm = document.getElementById("password-form");
    const password = document.getElementById("new-password");
    const confirmation = document.getElementById("confirm-password");
    const errorBox = document.getElementById("password-error");
    const successBox = document.getElementById("password-success");
    const submit = document.getElementById("password-submit");

    loginIntro.hidden = true;
    loginForm.hidden = true;
    loginHelp.hidden = true;
    setupIntro.hidden = false;
    setupForm.hidden = false;
    showPage();
    password.focus();

    setupForm.addEventListener("submit", async event => {
      event.preventDefault();
      errorBox.hidden = true;
      successBox.hidden = true;
      if (password.value.length < 8) {
        errorBox.textContent = "Das Passwort muss mindestens 8 Zeichen lang sein.";
        errorBox.hidden = false;
        password.focus();
        return;
      }
      if (password.value !== confirmation.value) {
        errorBox.textContent = "Die beiden Passwörter stimmen nicht überein.";
        errorBox.hidden = false;
        confirmation.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = "Passwort wird gespeichert …";
      try {
        const user = await authRequest("user", {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ password: password.value })
        });
        session.user = user;
        saveSession(session);
        successBox.textContent = "Dein Passwort wurde gespeichert. Du wirst jetzt angemeldet.";
        successBox.hidden = false;
        setTimeout(() => window.location.replace(APP_ROOT_URL.href), 900);
      } catch (error) {
        errorBox.textContent = readableError(error);
        errorBox.hidden = false;
        submit.disabled = false;
        submit.textContent = "Passwort speichern";
      }
    });
  }

  async function initLoginPage() {
    const callback = readAuthCallback();
    if (callback && callback.error) {
      const errorBox = document.getElementById("login-error");
      errorBox.textContent = "Der Einladungslink ist ungültig oder abgelaufen. Bitte fordere eine neue Einladung an.";
      errorBox.hidden = false;
      showPage();
      return;
    }
    if (callback && callback.session && ["invite", "recovery"].includes(callback.type)) {
      initPasswordSetup(callback.session);
      return;
    }

    const session = await getValidSession();
    if (session) {
      window.location.replace(safeReturnUrl());
      return;
    }

    const form = document.getElementById("login-form");
    const email = document.getElementById("login-email");
    const password = document.getElementById("login-password");
    const errorBox = document.getElementById("login-error");
    const submit = document.getElementById("login-submit");
    showPage();
    if (!form) return;

    form.addEventListener("submit", async event => {
      event.preventDefault();
      errorBox.hidden = true;
      submit.disabled = true;
      submit.textContent = "Anmeldung läuft …";
      try {
        const sessionData = await authRequest("token?grant_type=password", {
          method: "POST",
          body: JSON.stringify({ email: email.value.trim(), password: password.value })
        });
        saveSession(sessionData);
        window.location.replace(safeReturnUrl());
      } catch (error) {
        errorBox.textContent = readableError(error);
        errorBox.hidden = false;
        password.focus();
      } finally {
        submit.disabled = false;
        submit.textContent = "Anmelden";
      }
    });
  }

  function addAccountControl(session) {
    const header = document.querySelector(".app-header, .app-container > .header");
    if (!header || header.querySelector(".account-control")) return;
    const account = document.createElement("div");
    account.className = "account-control";
    const email = session.user && session.user.email ? session.user.email : "Angemeldet";
    const label = document.createElement("span");
    label.title = email;
    label.textContent = email.split("@")[0];
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Abmelden";
    account.append(label, button);
    button.addEventListener("click", async () => {
      const current = readSession();
      saveSession(null);
      if (current && current.access_token && navigator.onLine) {
        authRequest("logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${current.access_token}` }
        }).catch(() => {});
      }
      window.location.replace(new URL("login", APP_ROOT_URL).href);
    });
    header.appendChild(account);
  }

  async function protectPage() {
    const session = await getValidSession();
    if (!session) {
      window.location.replace(loginUrl());
      return;
    }
    addAccountControl(session);
    showPage();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.authPage === "login") initLoginPage();
    else protectPage();
  });
})();
