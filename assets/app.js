function initSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  });

  canvas.addEventListener('pointerup', (e) => {
    e.preventDefault();
    drawing = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointerleave', () => {
    drawing = false;
  });
}

function clearSignature(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll("canvas[id^='sig-']").forEach(canvas => {
    initSignaturePad(canvas.id);
  });
});

// PDF-Export
function saveAsPdf(fileName = "Protokoll") {
  const element = document.querySelector(".app-container");
  if (!element) return;
  if (typeof html2pdf === "undefined") {
    console.error("html2pdf nicht geladen");
    return;
  }

  // PDF-Layout einschalten
  document.body.classList.add("pdf-mode");

  const opt = {
    margin: 10,
    filename: fileName + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0   // kein Scroll-Versatz
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      // PDF-Layout wieder ausschalten
      document.body.classList.remove("pdf-mode");
    })
    .catch(() => {
      document.body.classList.remove("pdf-mode");
    });
}
// PDF über jsPDF
function exportGasPdf() {
  const jspdfNS = window.jspdf || window.jsPDF;
  if (!jspdfNS) {
    alert("jsPDF nicht geladen – Script-Tag prüfen!");
    return;
  }

  const jsPDF = jspdfNS.jsPDF || jspdfNS;
  if (typeof jsPDF !== "function") {
    alert("jsPDF-Constructor nicht gefunden.");
    return;
  }

  // Hilfsfunktion zum Auslesen von Feldern
  const v = (id) => {
    const el = document.getElementById(id);
    return el && el.value ? el.value.trim() : "";
  };

  // Logo laden (Pfad relativ zum Formular!)
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "../../assets/WBS_Logo_WT.png";

  img.onload = () => {
    const doc = new jsPDF("p", "mm", "a4");
    let y = 15;

    // --------- Logo + Kopfzeile ----------
    // Logo links oben, Breite ca. 40 mm, Höhe auto
    doc.addImage(img, "PNG", 15, y, 40, 0);

    doc.setFontSize(16);
    doc.text("GAS-DRUCKPROBE", 195 - 15, y + 6, { align: "right" });

    doc.setFontSize(10);
    doc.text("Druckprüfung nach TRGI / DVGW G 600", 195 - 15, y + 11, { align: "right" });

    y += 20;

    doc.setFontSize(12);
    doc.text("Druckprüfprotokoll Gasinstallation", 15, y);
    y += 4;

    doc.setLineWidth(0.2);
    doc.line(15, y, 195, y);
    y += 5;

    // --------- Objekt / Auftraggeber ----------
    doc.setFontSize(11);
    doc.text("Objekt / Auftraggeber", 15, y);
    y += 5;

    doc.setFontSize(9);
    doc.text("Objekt / Projekt:", 15, y);
    doc.text("Auftraggeber / Kunde:", 105, y);
    y += 4;
    doc.text(v("objekt"), 15, y);
    doc.text(v("auftraggeber"), 105, y);
    y += 6;

    doc.text("Adresse:", 15, y);
    doc.text("Anlagenteil:", 105, y);
    y += 4;
    const adrLines = doc.splitTextToSize(v("adresse"), 80);
    const anlLines = doc.splitTextToSize(v("anlage"), 80);
    doc.text(adrLines, 15, y);
    doc.text(anlLines, 105, y);
    y += Math.max(adrLines.length, anlLines.length) * 4 + 4;

    // --------- Prüfbedingungen ----------
    doc.setFontSize(11);
    doc.text("Prüfbedingungen / Prüfablauf nach TRGI", 15, y);
    y += 5;

    doc.setFontSize(9);
    doc.text("Umgebungstemperatur:", 15, y);
    doc.text("Verwendetes Messgerät / Manometer:", 80, y);
    y += 4;
    doc.text((v("temp") ? v("temp") + " °C" : ""), 15, y);
    const mgLines = doc.splitTextToSize(v("messgeraet"), 110);
    doc.text(mgLines, 80, y);
    y += mgLines.length * 4 + 4;

    // Vorprüfung
    doc.setFontSize(10);
    doc.text("Vorprüfung als Belastungsprobe", 15, y);
    y += 4;
    doc.setFontSize(8);
    doc.text("Prüfdruck 1 bar, Prüfdauer 10 Minuten mit Luft oder inertem Gas", 15, y);
    y += 4;

    doc.setFontSize(9);
    doc.text("Dauer der Belastung:", 15, y);
    doc.text("Prüfdruck:", 105, y);
    y += 4;
    doc.text((v("vorpruefung_dauer") ? v("vorpruefung_dauer") + " min" : ""), 15, y);
    doc.text((v("vorpruefung_druck") ? v("vorpruefung_druck") + " bar" : ""), 105, y);
    y += 8;

    // Hauptprüfung
    doc.setFontSize(10);
    doc.text("Hauptprüfung als Dichtheitsprüfung", 15, y);
    y += 4;
    doc.setFontSize(8);
    doc.text("Prüfdruck 150 mbar, Prüfdauer 10 Minuten mit Luft oder inertem Gas", 15, y);
    y += 4;

    doc.setFontSize(9);
    doc.text("Dauer der Belastung:", 15, y);
    doc.text("Prüfdruck:", 105, y);
    y += 4;
    doc.text((v("hauptpruefung_dauer") ? v("hauptpruefung_dauer") + " min" : ""), 15, y);
    doc.text((v("hauptpruefung_druck") ? v("hauptpruefung_druck") + " mbar" : ""), 105, y);
    y += 8;

    // --------- Messwerte ----------
    doc.setFontSize(11);
    doc.text("Messwerte", 15, y);
    y += 5;

    doc.setFontSize(9);
    doc.text("Anfangsdruck Belastungsprobe:", 15, y);
    doc.text("Enddruck Belastungsprobe:", 105, y);
    y += 4;
    doc.text((v("p_start") ? v("p_start") + " bar" : ""), 15, y);
    doc.text((v("p_ende") ? v("p_ende") + " bar" : ""), 105, y);
    y += 6;

    doc.text("Druckänderung / Druckabfall:", 15, y);
    y += 4;
    const daLines = doc.splitTextToSize(v("druckabfall"), 180);
    doc.text(daLines, 15, y);
    y += daLines.length * 4 + 4;

    doc.text("Durchgeführte Lecksuche (Seifenwasser / Lecksuchspray / Schnüffler):", 15, y);
    y += 4;
    const lsLines = doc.splitTextToSize(v("lecksuche"), 180);
    doc.text(lsLines, 15, y);
    y += lsLines.length * 4 + 8;

    // --------- Bewertung ----------
    doc.setFontSize(11);
    doc.text("Bewertung der Druckprobe", 15, y);
    y += 5;

    doc.setFontSize(9);
    const ergInput = document.querySelector('input[name="ergebnis"]:checked');
    const ergText = ergInput && ergInput.value === "bestanden"
      ? "Druckprobe nach TRGI bestanden – keine Undichtheiten erkennbar."
      : "Druckprobe nicht bestanden – Undichtheiten festgestellt (siehe Bemerkungen).";

    doc.text("Prüfergebnis:", 15, y);
    y += 4;
    const ergLines = doc.splitTextToSize(ergText, 180);
    doc.text(ergLines, 15, y);
    y += ergLines.length * 4 + 4;

    doc.text("Bemerkungen / festgestellte Mängel / Maßnahmen:", 15, y);
    y += 4;
    const bemLines = doc.splitTextToSize(v("bemerkungen"), 180);
    doc.text(bemLines, 15, y);
    y += bemLines.length * 4 + 8;

    // --------- Ort / Datum ----------
    doc.text("Ort: " + v("ort"), 15, y);
    doc.text("Datum: " + v("datum"), 105, y);
    y += 10;

    // --------- Unterschriften (Platzhalter) ----------
    doc.line(30, y, 90, y);
    doc.text("Unterschrift Monteur", 30, y + 4);
    doc.line(120, y, 180, y);
    doc.text("Unterschrift Auftraggeber", 120, y + 4);

    doc.save("Gas_Druckprobe_TRGI.pdf");
  };

  img.onerror = () => {
    alert("Logo konnte nicht geladen werden. Pfad prüfen: ../../assets/WBS_Logo_WT.png");
  };
}





// Globaler PDF-Export für alle Formulare
window.exportFormPdf = async function (filename) {
  
  // Seite ganz nach oben scrollen
  window.scrollTo(0, 0);

  // kurz warten, bis Browser neu gerendert hat
  await new Promise(resolve => setTimeout(resolve, 150));

  const element = document.querySelector('.app-container');
  if (!element) return;

  // ALLES, was unten nicht im PDF erscheinen soll, hier einsammeln
  // z.B. die Button-Leiste
  const toHide = element.querySelectorAll('.button-row');

  // vorübergehend ausblenden
  toHide.forEach(el => el.classList.add('pdf-export-hide'));

  const opt = {
    margin:       [8, 1, 1, 1],
    filename:     filename || 'Formular.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] },
  };
  
  try {
    // html2pdf arbeitet mit dem DOM-Zustand JETZT (Buttons sind versteckt)
    await html2pdf().set(opt).from(element).save();
  } finally {
    // egal was passiert: Buttons hinterher wieder anzeigen
    toHide.forEach(el => el.classList.remove('pdf-export-hide'));
  }
  
};

