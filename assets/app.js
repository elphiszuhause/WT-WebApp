(function () {
  "use strict";

  const DRAFT_PREFIX = "wt-form-draft:";
  const APP_ROOT_URL = new URL("../", document.currentScript ? document.currentScript.src : window.location.href);
  const signaturePads = new Map();
  let installPrompt = null;
  let toastTimer = null;

  function showToast(message) {
    const toast = document.getElementById("app-toast") || createToast();
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  function createToast() {
    const toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
    return toast;
  }

  function draftKey(form) {
    return DRAFT_PREFIX + window.location.pathname + ":" + (form.id || "main");
  }

  function fieldKey(field, index) {
    return `${field.name || field.id || "field"}::${index}`;
  }

  function serializeForm(form) {
    const data = {};
    [...form.elements].forEach((field, index) => {
      if (!field.name && !field.id) return;
      const key = fieldKey(field, index);
      if (field.type === "checkbox" || field.type === "radio") {
        data[key] = field.checked;
      } else if (field.type !== "button" && field.type !== "reset" && field.type !== "submit") {
        data[key] = field.value;
      }
    });

    const signatures = {};
    form.querySelectorAll("canvas[id]").forEach(canvas => {
      if (!isCanvasBlank(canvas)) signatures[canvas.id] = canvas.toDataURL("image/png");
    });
    return { data, signatures, savedAt: new Date().toISOString() };
  }

  function saveDraft(form, quiet = true) {
    try {
      localStorage.setItem(draftKey(form), JSON.stringify(serializeForm(form)));
      updateDraftStatus(form, "Entwurf automatisch gespeichert");
      if (!quiet) showToast("Entwurf gespeichert");
    } catch (error) {
      console.warn("Entwurf konnte nicht gespeichert werden", error);
      updateDraftStatus(form, "Entwurf konnte nicht gespeichert werden", true);
    }
  }

  function restoreDraft(form) {
    let draft;
    try { draft = JSON.parse(localStorage.getItem(draftKey(form))); } catch (_) { return; }
    if (!draft || !draft.data) return;

    const roomCount = Object.keys(draft.data).filter(key => key.startsWith("raum_name[]::")).length;
    if (roomCount > 1 && typeof window.addRoom === "function") {
      while (form.querySelectorAll('[name="raum_name[]"]').length < roomCount) window.addRoom();
    }

    [...form.elements].forEach((field, index) => {
      const key = fieldKey(field, index);
      if (!(key in draft.data)) return;
      if (field.type === "checkbox" || field.type === "radio") field.checked = Boolean(draft.data[key]);
      else if (field.type !== "button" && field.type !== "reset" && field.type !== "submit") field.value = draft.data[key];
    });

    requestAnimationFrame(() => {
      Object.entries(draft.signatures || {}).forEach(([id, image]) => drawSignatureImage(id, image));
    });
    const saved = draft.savedAt ? new Date(draft.savedAt).toLocaleString("de-DE") : "";
    updateDraftStatus(form, `Entwurf wiederhergestellt${saved ? ` · ${saved}` : ""}`);
    showToast("Gespeicherten Entwurf wiederhergestellt");
  }

  function clearDraft(form) {
    localStorage.removeItem(draftKey(form));
    form.querySelectorAll("canvas[id]").forEach(canvas => clearSignature(canvas.id, false));
    updateDraftStatus(form, "Formular geleert");
    showToast("Formular und Entwurf gelöscht");
  }

  function updateDraftStatus(form, message, error = false) {
    let status = form.querySelector(".draft-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "draft-status";
      const buttons = form.querySelector(".button-row");
      if (buttons) buttons.before(status); else form.appendChild(status);
    }
    status.textContent = message;
    status.style.color = error ? "var(--danger)" : "";
  }

  function initAutosave(form) {
    restoreDraft(form);
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveDraft(form), 400);
    };
    form.addEventListener("input", schedule);
    form.addEventListener("change", schedule);
    form.addEventListener("reset", () => setTimeout(() => clearDraft(form), 0));
  }

  function isCanvasBlank(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !canvas.width || !canvas.height) return true;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) return false;
    return true;
  }

  function initSignaturePad(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || signaturePads.has(canvasId)) return;
    const ctx = canvas.getContext("2d");
    const state = { drawing: false, lastX: 0, lastY: 0, ratio: 1 };

    function resize(preserve = true) {
      const snapshot = preserve && canvas.width ? canvas.toDataURL("image/png") : null;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      state.ratio = ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#172033";
      if (snapshot) drawSignatureImage(canvasId, snapshot);
    }

    function position(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    canvas.addEventListener("pointerdown", event => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const point = position(event);
      state.drawing = true;
      state.lastX = point.x;
      state.lastY = point.y;
    });
    canvas.addEventListener("pointermove", event => {
      if (!state.drawing) return;
      event.preventDefault();
      const point = position(event);
      ctx.beginPath();
      ctx.moveTo(state.lastX, state.lastY);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      state.lastX = point.x;
      state.lastY = point.y;
    });
    const stop = event => {
      if (!state.drawing) return;
      state.drawing = false;
      if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      const form = canvas.closest("form");
      if (form) saveDraft(form);
    };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);

    signaturePads.set(canvasId, { canvas, ctx, resize });
    resize(false);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resize(true), 180);
    });
  }

  function drawSignatureImage(canvasId, source) {
    const pad = signaturePads.get(canvasId);
    if (!pad || !source) return;
    const image = new Image();
    image.onload = () => {
      const { canvas, ctx } = pad;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    image.src = source;
  }

  function clearSignature(canvasId, save = true) {
    const pad = signaturePads.get(canvasId);
    if (!pad) return;
    const { canvas, ctx } = pad;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (save) {
      const form = canvas.closest("form");
      if (form) saveDraft(form);
    }
  }

  async function exportFormPdf(filename) {
    document.querySelectorAll("form").forEach(form => saveDraft(form));
    const title = filename || document.title.replace(/[^a-z0-9äöüß_-]+/gi, "_") + ".pdf";
    const finalName = title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`;
    const element = document.querySelector(".app-container");

    if (!element || typeof window.html2pdf === "undefined" || window.location.protocol === "file:") {
      window.print();
      return;
    }

    document.body.classList.add("pdf-mode");
    element.querySelectorAll(".button-row, .draft-status, .signature-clear").forEach(node => node.classList.add("pdf-export-hide"));
    showToast("PDF wird erstellt …");
    try {
      await window.html2pdf().set({
        margin: [10, 12, 12, 12],
        filename: finalName,
        image: { type: "jpeg", quality: .97 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".section", ".signature-pad"] }
      }).from(element).save();
      showToast("PDF wurde erstellt");
    } catch (error) {
      console.error(error);
      document.querySelectorAll(".toast").forEach(node => node.classList.remove("visible"));
      window.print();
    } finally {
      document.body.classList.remove("pdf-mode");
      document.querySelectorAll(".pdf-export-hide").forEach(node => node.classList.remove("pdf-export-hide"));
    }
  }

  function initConnectionStatus() {
    const badge = document.getElementById("connection-status");
    if (!badge) return;
    const update = () => {
      badge.textContent = navigator.onLine ? "Online" : "Offline";
      badge.classList.toggle("offline", !navigator.onLine);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  function initPwa() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(new URL("sw.js", APP_ROOT_URL), { scope: APP_ROOT_URL.pathname }).catch(console.warn);
    }
    const installButton = document.getElementById("install-app");
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      if (installButton) installButton.hidden = false;
    });
    if (installButton) installButton.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("canvas[id]").forEach(canvas => initSignaturePad(canvas.id));
    document.querySelectorAll("form").forEach(initAutosave);
    initConnectionStatus();
    initPwa();
  });

  window.initSignaturePad = initSignaturePad;
  window.clearSignature = clearSignature;
  window.exportFormPdf = exportFormPdf;
  window.saveAsPdf = exportFormPdf;
  window.exportGasPdf = () => exportFormPdf("Gas_Druckprobe_TRGI.pdf");
})();
