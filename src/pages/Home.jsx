import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/* ───────── Configuración (edita antes de publicar) ───────── */
const PAYPAL_DONATION_URL = "https://www.paypal.com/ncp/payment/FX99FVTXMVNFC";
const FEEDBACK_EMAIL = "YOUR_EMAIL@example.com";

const COVERAGE_THRESHOLD = 0.99; // la figura se da por llena al 99 % y cierra con un fundido
const GUIDE_FROM = 0.9; // desde este avance, las zonas sin pintar laten suavemente
const CLOSE_MS = 280; // duración del fundido que cierra el 1 % restante
const FILL = "#e4e4e8";
const CELL = 2; // resolución de la cuadrícula de cobertura (px)
const BRUSH = [5, 9, 14];
const SCALE = [0.18, 0.25, 0.33];
const SOUNDS = ["deep", "tide", "bowl"];
const D_PENT = [587.33, 659.25, 739.99, 880, 987.77]; // D5 E5 F#5 A5 B5 (tono al completar)
const D_PENT_LOW = [293.66, 329.63, 369.99, 440, 493.88]; // D4 E4 F#4 A4 B4 (cuencos)
const LS = { size: "still_size", brush: "still_brush", mode: "still_mode", lang: "still_lang", sound: "still_sound", onboarded: "still_onboarded" };

const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } };
const idx = (v) => Math.min(2, Math.max(0, parseInt(v, 10) || 0));
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── Textos (ES / EN) ───────── */
const T = {
  en: {
    tagline: "A TINY GAME FOR NOISY MINDS", still: "STILL", silence: "SILENCE", start: "START",
    infoStill: "20 FIGURES · 3–7 MIN", infoSilence: "NO LIMIT · NO SOUND",
    welcome: "WELCOME", welcomeCopy: "Choose a mode, press **START**, then trace the shape with your finger or cursor until it is filled.\n\nNo race. No score. Just enough quiet to finish a shape.", begin: "BEGIN",
    leave: "LEAVE?", leaveCopy: "Your progress in this session will be lost.", keep: "KEEP GOING", exit: "EXIT",
    options: "OPTIONS", gameSettings: "GAME SETTINGS", size: "SIZE", brush: "BRUSH", language: "LANGUAGE", levels: ["SMALL", "MEDIUM", "LARGE"],
    sound: "SOUND", sounds: { deep: "DEEP", tide: "TIDE", bowl: "BOWL" },
    soundDesc: { deep: "A warm, steady low hum.", tide: "A slow swell, like distant waves.", bowl: "Soft tones and far-off bowls." },
    information: "INFORMATION", howItWorks: "HOW IT WORKS", feedback: "FEEDBACK", support: "SUPPORT STILL", about: "ABOUT", privacy: "PRIVACY", done: "DONE",
    help: ["Choose a mode, then press **START**.", "Move your finger or cursor across the shape until it is filled.", "In **STILL**, complete 20 figures with a quiet sound layer.", "In **SILENCE**, there is no sound and no limit.", "That's it."],
    feedbackCopy: "Tell us what felt good, strange, distracting, or worth changing.", placeholder: "Your thoughts...", send: "SEND", feedbackCategory: "CATEGORY", categories: { suggestion: "Suggestion", bug: "Bug Report", general: "General Feedback" }, feedbackSuccess: "Thank you. Your feedback has been received.", feedbackError: "Something went wrong. Please try again.", feedbackCooldown: "Please wait a moment before sending again.", feedbackSending: "SENDING...", feedbackEmpty: "Please write a short message first.",
    supportCopy: ["Your support keeps STILL free and independent, and helps future updates and improvements.", "If STILL helped you find a little silence, you can support it."], supportNote: "You will be taken to PayPal to choose the amount.", paypalMissing: "Add your real PayPal donation link in PAYPAL_DONATION_URL before publishing.",
    aboutTitle: "ABOUT STILL", aboutCopy: ["**A tiny game for noisy minds.**", "There is no opponent.\nNo ranking.\nNo achievement waiting for you.", "Just a shape, a brush, and a few quiet minutes.", "STILL exists to give attention somewhere simple to go."],
    privacyCopy: ["STILL does not require an account to play.", "This version does not ask for personal information to play the game.", "Settings (size, brush, mode, sound, language) are stored only on this device.", "Payment information is handled by PayPal and is never entered into STILL."],
    finish: "20 figures, traced quietly.\nA little silence, found.", again: "AGAIN", home: "HOME",
    aOpenMenu: "Open menu", aCloseMenu: "Close menu", aClose: "Close", aExit: "Exit session", aDecSize: "Decrease size", aIncSize: "Increase size", aDecBrush: "Decrease brush", aIncBrush: "Increase brush", aFeedback: "Feedback message",
  },
  es: {
    tagline: "UN PEQUEÑO JUEGO PARA MENTES RUIDOSAS", still: "STILL", silence: "SILENCIO", start: "EMPEZAR",
    infoStill: "20 FIGURAS · 3–7 MIN", infoSilence: "SIN LÍMITE · SIN SONIDO",
    welcome: "BIENVENIDO", welcomeCopy: "Elige un modo, pulsa **EMPEZAR** y recorre la figura con el dedo o el cursor hasta llenarla.\n\nSin carreras. Sin puntos. Solo el silencio justo para terminar una figura.", begin: "COMENZAR",
    leave: "¿SALIR?", leaveCopy: "Perderás el progreso de esta sesión.", keep: "SEGUIR", exit: "SALIR",
    options: "OPCIONES", gameSettings: "AJUSTES DEL JUEGO", size: "TAMAÑO", brush: "PINCEL", language: "IDIOMA", levels: ["PEQUEÑO", "MEDIO", "GRANDE"],
    sound: "SONIDO", sounds: { deep: "PROFUNDO", tide: "MAREA", bowl: "CUENCO" },
    soundDesc: { deep: "Un murmullo grave, cálido y constante.", tide: "Un vaivén lento, como olas lejanas.", bowl: "Tonos suaves y cuencos a lo lejos." },
    information: "INFORMACIÓN", howItWorks: "CÓMO FUNCIONA", feedback: "COMENTARIOS", support: "APOYA STILL", about: "ACERCA DE", privacy: "PRIVACIDAD", done: "LISTO",
    help: ["Elige un modo y pulsa **EMPEZAR**.", "Pasa el dedo o el cursor por la figura hasta llenarla.", "En **STILL** completas 20 figuras con una capa de sonido suave.", "En **SILENCIO** no hay sonido ni límite.", "Eso es todo."],
    feedbackCopy: "Cuéntanos qué se sintió bien, raro, distrajo o merece cambiar.", placeholder: "Tus ideas...", send: "ENVIAR", feedbackCategory: "CATEGORÍA", categories: { suggestion: "Sugerencia", bug: "Error", general: "Comentario general" }, feedbackSuccess: "Gracias. Tu comentario ha sido recibido.", feedbackError: "Algo salió mal. Inténtalo de nuevo.", feedbackCooldown: "Espera un momento antes de enviar de nuevo.", feedbackSending: "ENVIANDO...", feedbackEmpty: "Escribe primero un mensaje breve.",
    supportCopy: ["Tu apoyo mantiene STILL gratis e independiente y ayuda a futuras mejoras.", "Si STILL te ayudó a encontrar un poco de silencio, puedes apoyarlo."], supportNote: "Irás a PayPal para elegir el monto.", paypalMissing: "Agrega tu enlace real de PayPal en PAYPAL_DONATION_URL antes de publicar.",
    aboutTitle: "ACERCA DE STILL", aboutCopy: ["**Un pequeño juego para mentes ruidosas.**", "No hay rival.\nNi ranking.\nNi logros esperándote.", "Solo una figura, un pincel y unos minutos de calma.", "STILL existe para que la atención tenga un lugar simple adonde ir."],
    privacyCopy: ["STILL no requiere cuenta para jugar.", "Esta versión no pide datos personales para jugar.", "Los ajustes (tamaño, pincel, modo, sonido, idioma) se guardan solo en este dispositivo.", "El pago lo gestiona PayPal y nunca se ingresa en STILL."],
    finish: "20 figuras, trazadas en calma.\nUn poco de silencio, encontrado.", again: "OTRA VEZ", home: "INICIO",
    aOpenMenu: "Abrir menú", aCloseMenu: "Cerrar menú", aClose: "Cerrar", aExit: "Salir de la sesión", aDecSize: "Reducir tamaño", aIncSize: "Aumentar tamaño", aDecBrush: "Reducir pincel", aIncBrush: "Aumentar pincel", aFeedback: "Mensaje de comentarios",
  },
};

/* ───────── Formas suaves (todas con esquinas redondeadas, sin puntas agudas) ───────── */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

/* Corte de esquinas de Chaikin: convierte un polígono grueso en una curva cerrada suave */
function chaikin(pts, it) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    p = q;
  }
  return p;
}
const radial = (n, fn) => Array.from({ length: n }, (_, i) => { const a = (i * TAU) / n, r = fn(a); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; });

const SHAPES = {
  circle: () => { const ey = rnd(0.84, 1); return radial(96, () => 1).map((p) => ({ x: p.x, y: p.y * ey })); },
  pebble: (d) => { const k = 2 + Math.floor(rnd(0, 2)), amp = rnd(0.05, 0.1 + 0.04 * d), ph = rnd(0, TAU); return radial(96, (a) => 1 + amp * Math.cos(k * a + ph)); },
  poly: (d, n) => { const jit = 0.04 + 0.1 * d, rot = rnd(0, TAU); return chaikin(Array.from({ length: n }, (_, i) => { const a = rot + (i * TAU) / n, r = 1 + rnd(-jit, jit); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; }), 4); },
  leaf: () => { const w = rnd(0.55, 0.7); return chaikin([{ x: 0, y: -1 }, { x: w, y: -0.1 }, { x: 0, y: 1 }, { x: -w, y: -0.1 }], 4); },
  drop: () => { // cuerpo circular + tangentes hasta un vértice, luego suavizado
    const R = rnd(0.55, 0.66), D = R / Math.sin(rnd(0.42, 0.52)), beta = Math.acos(R / D), cy = -1 + D, pts = [{ x: 0, y: -1 }];
    for (let i = 0; i <= 10; i++) { const th = beta + ((TAU - 2 * beta) * i) / 10; pts.push({ x: R * Math.sin(th), y: cy - R * Math.cos(th) }); }
    return chaikin(pts, 4);
  },
  flower: (d) => { const k = 3 + Math.floor(rnd(0, 2 + Math.round(2 * d))), amp = 0.13 + 0.11 * d, ph = rnd(0, TAU); return radial(128, (a) => 1 + amp * Math.cos(k * a + ph)); },
  organic: (d) => { const k = 2 + Math.floor(rnd(0, 3)), amp = 0.1 + 0.14 * d, p2 = rnd(0, TAU), ph = rnd(0, TAU); return radial(128, (a) => 1 + amp * Math.cos(k * a + ph) + amp * 0.4 * Math.cos((k + 1) * a + p2)); },
};
/* Categorías visuales: evita que dos formas parecidas salgan seguidas */
const SHAPE_CATEGORY = {
  circle: "round", pebble: "round",
  poly3: "polygon", poly4: "polygon", poly5: "polygon", poly6: "polygon", poly7: "polygon",
  leaf: "leaf", drop: "leaf",
  flower: "complex", organic: "complex",
};
/* De formas muy simples al inicio a más variadas hacia la figura 20 */
function pickType(d, last, lastCat) {
  const pool = [["circle", 3 - 2 * d], ["pebble", 2], ["poly3", 1.5], ["poly4", 2 - d]];
  if (d > 0.25) pool.push(["leaf", 1.6], ["drop", 1.6], ["poly5", 1.4], ["poly6", 1.2]);
  if (d > 0.55) pool.push(["flower", 2.2 * d], ["organic", 2 * d], ["poly7", 1]);
  let list = pool.filter(([t, w]) => t !== last && w > 0 && SHAPE_CATEGORY[t] !== lastCat);
  if (!list.length) list = pool.filter(([t, w]) => t !== last && w > 0); // relaja si todo es la misma categoría
  let r = Math.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [t, w] of list) { r -= w; if (r <= 0) return t; }
  return list[0][0];
}
/* Genera la figura: normaliza, añade un leve temblor de trazo a mano, rota y escala */
function buildShape(type, d, cx, cy, size) {
  const raw = type.startsWith("poly") ? SHAPES.poly(d, parseInt(type.slice(4), 10)) : SHAPES[type](d);
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  raw.forEach((p) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  let rmax = 0;
  const c = raw.map((p) => { const q = { x: p.x - mx, y: p.y - my }; rmax = Math.max(rmax, Math.hypot(q.x, q.y)); return q; });
  const rot = rnd(0, TAU), wob = rnd(0.008, 0.02), w1 = rnd(0, TAU), w2 = rnd(0, TAU);
  return c.map((p) => {
    const a = Math.atan2(p.y, p.x), k = (size * 1.08) / rmax * (1 + wob * (Math.sin(2 * a + w1) + 0.6 * Math.sin(3 * a + w2)));
    const x = p.x * k, y = p.y * k;
    return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) };
  });
}

/* ───────── Sonidos (sintetizados en el navegador, sin archivos) ───────── */
function noiseBuffer(A, seconds, kind) {
  const sr = A.sampleRate, n = Math.floor(sr * seconds), fade = Math.floor(sr * 0.4), raw = new Float32Array(n + fade);
  let last = 0, p0 = 0, p1 = 0, p2 = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "brown") { last = (last + 0.02 * w) / 1.02; raw[i] = last * 3.5; }
    else { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; raw[i] = (p0 + p1 + p2 + w * 0.1848) * 0.2; }
  }
  const buf = A.createBuffer(1, n, sr), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = raw[i];
  for (let i = 0; i < fade; i++) { const t = (i / fade) * Math.PI / 2; d[i] = raw[i] * Math.sin(t) + raw[n + i] * Math.cos(t); } // empalme sin clic
  let s = 0; for (let i = 0; i < n; i++) s += d[i] * d[i];
  const k = 0.25 / (Math.sqrt(s / n) || 1); for (let i = 0; i < n; i++) d[i] *= k;
  return buf;
}
/* Cada tipo se nivela a un volumen bajo y parejo (RMS ≈ 0.015) */
function buildSound(A, type, master) {
  const srcs = [], timers = []; let alive = true;
  const osc = (f, detune = 0) => { const o = A.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = detune; srcs.push(o); return o; };
  if (type === "deep") {
    const s = A.createBufferSource(); s.buffer = noiseBuffer(A, 6, "brown"); s.loop = true; srcs.push(s);
    const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.4;
    const g = A.createGain(); g.gain.value = 0.066;
    s.connect(lp); lp.connect(g); g.connect(master); s.start();
  } else if (type === "tide") {
    const s = A.createBufferSource(); s.buffer = noiseBuffer(A, 8, "pink"); s.loop = true; srcs.push(s);
    const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.5;
    const swell = A.createGain(); swell.gain.value = 0.5;
    const out = A.createGain(); out.gain.value = 0.127;
    const l1 = osc(0.09), l2 = osc(0.061); // olas largas, nunca idénticas
    const d1 = A.createGain(), d2 = A.createGain(), df = A.createGain();
    d1.gain.value = 0.3; d2.gain.value = 0.16; df.gain.value = 380;
    l1.connect(d1); d1.connect(swell.gain); l2.connect(d2); d2.connect(swell.gain); l1.connect(df); df.connect(lp.frequency);
    s.connect(lp); lp.connect(swell); swell.connect(out); out.connect(master); s.start(); l1.start(); l2.start();
  } else {
    const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const pad = A.createGain(); pad.gain.value = 0.086;
    lp.connect(pad); pad.connect(master);
    [[146.83, 0.5], [220, 0.35], [293.66, 0.25]].forEach(([f, amp], k) => {
      [-3, 3].forEach((dt) => {
        const o = osc(f, dt), g = A.createGain(), lfo = osc(0.05 + 0.02 * k), depth = A.createGain();
        g.gain.value = amp * 0.5 * (0.5 + 0.25 * 0); depth.gain.value = amp * 0.125;
        lfo.connect(depth); depth.connect(g.gain); o.connect(g); g.connect(lp); o.start(); lfo.start();
      });
    });
    const strike = () => {
      if (!alive) return;
      try {
        const t = A.currentTime, f = D_PENT_LOW[Math.floor(Math.random() * D_PENT_LOW.length)];
        [[1, 1], [2.76, 0.3], [5.4, 0.1]].forEach(([m, a]) => {
          const o = A.createOscillator(), g = A.createGain();
          o.type = "sine"; o.frequency.value = f * m;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * a, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
          o.connect(g); g.connect(master); o.start(t); o.stop(t + 6.2);
        });
      } catch { /* ignore */ }
      timers.push(setTimeout(strike, 9000 + Math.random() * 9000));
    };
    timers.push(setTimeout(strike, 2500));
  }
  return { stop(t) { alive = false; timers.forEach(clearTimeout); srcs.forEach((n) => { try { n.stop(t); } catch { /* ignore */ } }); } };
}

/* ───────── Motor de juego (JS puro, sin re-renders al dibujar) ───────── */
function createEngine({ canvasRef, textRef, fillRef, ringRef, cfg, ui }) {
  const E = { shape: null, strokes: [], grid: null, solid: false, done: false, drawing: false, last: null, timers: [],
    figure: 1, dpr: 1, w: 0, h: 0, active: false, audio: null, snd: null, prevT: 0, guide: false, raf: 0, wake: null,
    closeAt: 0, closeT: 0, closing: false, token: 0, lastType: "", lastCat: "" };
  const paint = document.createElement("canvas");
  const pctx = paint.getContext("2d");
  const brush = () => BRUSH[cfg.current.brushIndex];
  const later = (fn, ms) => E.timers.push(setTimeout(fn, ms));
  const clearTimers = () => { E.timers.forEach(clearTimeout); E.timers = []; };
  const setFill = (p) => { if (fillRef.current) fillRef.current.style.width = p + "%"; };
  const setFade = (o) => { if (canvasRef.current) canvasRef.current.style.opacity = o; };

  function inside(x, y) {
    const p = E.shape.pts; let res = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i], b = p[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) res = !res;
    }
    return res;
  }
  function path(c) {
    const p = E.shape.pts; c.beginPath(); c.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) c.lineTo(p[i].x, p[i].y);
    c.closePath();
  }

  /* Cuadrícula de cobertura: registra con exactitud qué celdas de la figura ya tocó el pincel */
  function buildGrid() {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    E.shape.pts.forEach((q) => { minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); });
    const w = Math.ceil((maxX - minX) / CELL) + 1, h = Math.ceil((maxY - minY) / CELL) + 1, d = new Uint8Array(w * h);
    let total = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
      if (inside(minX + (i + 0.5) * CELL, minY + (j + 0.5) * CELL)) { d[j * w + i] = 1; total++; }
    E.grid = { x0: minX, y0: minY, w, h, d, total, hit: 0 };
  }
  function mark(a, b) {
    const g = E.grid, r = brush(); // el radio contado = el radio dibujado
    const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - r - g.x0) / CELL));
    const i1 = Math.min(g.w - 1, Math.floor((Math.max(a.x, b.x) + r - g.x0) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - r - g.y0) / CELL));
    const j1 = Math.min(g.h - 1, Math.floor((Math.max(a.y, b.y) + r - g.y0) / CELL));
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * g.w + i; if (g.d[k] !== 1) continue;
      const px = g.x0 + (i + 0.5) * CELL, py = g.y0 + (j + 0.5) * CELL;
      let t = l2 ? ((px - a.x) * dx + (py - a.y) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const cx = a.x + t * dx - px, cy = a.y + t * dy - py;
      if (cx * cx + cy * cy <= r * r) { g.d[k] = 2; g.hit++; }
    }
  }
  function paintSeg(a, b) {
    const r = brush();
    pctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    pctx.fillStyle = FILL; pctx.strokeStyle = FILL; pctx.lineWidth = r * 2; pctx.lineCap = "round"; pctx.lineJoin = "round";
    pctx.beginPath(); pctx.moveTo(a.x, a.y); pctx.lineTo(b.x, b.y); pctx.stroke();
    pctx.beginPath(); pctx.arc(b.x, b.y, r, 0, Math.PI * 2); pctx.fill();
  }
  const stroke = (a, b) => { paintSeg(a, b); mark(a, b); };

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const c = canvas.getContext("2d");
    c.setTransform(E.dpr, 0, 0, E.dpr, 0, 0); c.clearRect(0, 0, E.w, E.h);
    if (!E.shape) return;
    c.save(); path(c); c.clip();
    if (E.solid) { c.fillStyle = FILL; c.fillRect(0, 0, E.w, E.h); }
    else {
      c.drawImage(paint, 0, 0, E.w, E.h);
      if (E.closing) { c.globalAlpha = E.closeT; c.fillStyle = FILL; c.fillRect(0, 0, E.w, E.h); c.globalAlpha = 1; } // cierre en fundido
      else if (E.guide && E.grid) { // guía de remanentes: las celdas sin pintar laten suavemente
        const g = E.grid;
        const a = reducedMotion() ? 0.16 : 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(performance.now() / 420));
        c.fillStyle = "rgba(228,228,232," + a.toFixed(3) + ")"; c.beginPath();
        for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++)
          if (g.d[j * g.w + i] === 1) c.rect(g.x0 + i * CELL, g.y0 + j * CELL, CELL, CELL);
        c.fill();
      }
    }
    c.restore();
    path(c); c.strokeStyle = E.solid ? FILL : "#8a8b92"; c.lineWidth = 1.5; c.stroke();
  }
  function guideLoop() {
    if (!E.guide || E.done || !E.active) { E.raf = 0; return; }
    draw(); E.raf = requestAnimationFrame(guideLoop);
  }
  function setGuide(on) {
    if (E.guide === on) return;
    E.guide = on;
    if (on && !reducedMotion() && !E.raf && typeof requestAnimationFrame === "function") E.raf = requestAnimationFrame(guideLoop);
    if (!on && E.raf) { cancelAnimationFrame(E.raf); E.raf = 0; }
  }

  function resize() {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = window.innerWidth, H = window.innerHeight, oldW = E.w || W, oldH = E.h || H;
    E.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * E.dpr; canvas.height = H * E.dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
    paint.width = canvas.width; paint.height = canvas.height;
    E.w = W; E.h = H;
    if (E.shape) {
      const dx = (W - oldW) / 2, dy = (H - oldH) / 2;
      if (dx || dy) {
        E.shape.pts.forEach((p) => { p.x += dx; p.y += dy; });
        E.strokes.forEach((s) => s.forEach((p) => { p.x += dx; p.y += dy; }));
        if (E.grid) { E.grid.x0 += dx; E.grid.y0 += dy; }
        if (E.last) { E.last.x += dx; E.last.y += dy; }
      }
      for (const s of E.strokes) { if (s.length === 1) paintSeg(s[0], s[0]); else for (let i = 1; i < s.length; i++) paintSeg(s[i - 1], s[i]); }
    }
    draw();
  }

  function makeShape() {
    const d = Math.min(1, (E.figure - 1) / 19), type = pickType(d, E.lastType, E.lastCat); E.lastType = type; E.lastCat = SHAPE_CATEGORY[type];
    const base = Math.min(E.w, E.h) * SCALE[cfg.current.sizeIndex];
    return { type, pts: buildShape(type, d, E.w / 2, E.h / 2 + 8, base) };
  }
  function newFigure() {
    setGuide(false); E.token++;
    E.shape = makeShape(); E.strokes = []; E.done = false; E.solid = false; E.drawing = false; E.last = null; E.closing = false; E.closeAt = 0; E.closeT = 0;
    pctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0); pctx.clearRect(0, 0, E.w, E.h);
    buildGrid();
    if (textRef.current) textRef.current.textContent = cfg.current.mode === "STILL" ? String(E.figure).padStart(2, "0") + " / 20" : cfg.current.t.silence;
    setFill(0); draw();
  }

  /* Háptica y tono suave al completar (escala de re pentatónica) */
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(14); } catch { /* ignore */ } }
  function chime() {
    if (cfg.current.mode !== "STILL" || !E.audio) return;
    try {
      const A = E.audio, t = A.currentTime;
      const o = A.createOscillator(), g = A.createGain();
      o.type = "sine"; o.frequency.value = D_PENT[(E.figure - 1) % D_PENT.length];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + 1.2);
    } catch { /* ignore */ }
  }

  /* Al 99 % el resto se cubre con un fundido corto; luego descansa, se desvanece y aparece la siguiente */
  function closeLoop(tok) {
    if (tok !== E.token || !E.shape) return;
    const t = Math.min(1, (performance.now() - E.closeAt) / CLOSE_MS);
    E.closeT = t * (2 - t); // ease-out
    if (t >= 1) { E.solid = true; E.closing = false; draw(); return; }
    draw(); requestAnimationFrame(() => closeLoop(tok));
  }
  function complete() {
    if (E.done) return;
    E.done = true; E.drawing = false; E.last = null; ringHide();
    setGuide(false); setFill(100); haptic(); chime();
    if (typeof requestAnimationFrame === "function" && !reducedMotion()) { E.closing = true; E.closeAt = performance.now(); E.closeT = 0; const tok = E.token; requestAnimationFrame(() => closeLoop(tok)); }
    else { E.solid = true; }
    draw();
    later(() => setFade("0"), 500);
    later(() => {
      if (cfg.current.mode === "STILL" && E.figure >= 20) { E.active = false; stopNoise(); releaseWake(); ui.finish(); }
      else { E.figure++; newFigure(); setFade("1"); }
    }, 950);
  }
  function update() {
    if (E.done || !E.grid || !E.grid.total) return;
    const ratio = E.grid.hit / E.grid.total;
    setFill(Math.min(100, (ratio / COVERAGE_THRESHOLD) * 100));
    setGuide(ratio >= GUIDE_FROM && ratio < COVERAGE_THRESHOLD);
    if (ratio >= COVERAGE_THRESHOLD) complete();
  }

  const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  /* Cursor de anillo: del tamaño exacto del pincel; más tenue fuera de la figura; oculto en pantallas táctiles */
  function ringHide() { const r = ringRef.current; if (r) r.style.opacity = "0"; }
  function ringShow(e) {
    const ring = ringRef.current; if (!ring) return;
    if (e.pointerType === "touch" || !E.active || E.done || !E.shape) { ring.style.opacity = "0"; return; }
    const p = pos(e), r = brush();
    ring.style.width = ring.style.height = r * 2 + "px";
    ring.style.transform = "translate(" + (p.x - r) + "px," + (p.y - r) + "px)";
    ring.style.opacity = inside(p.x, p.y) ? "0.9" : "0.35";
    ring.style.background = E.drawing ? "rgba(228,228,232,.14)" : "transparent";
  }

  function down(e) {
    if (!E.active || E.done || !E.shape) return;
    e.preventDefault();
    const p = pos(e); E.drawing = true; E.last = p; E.strokes.push([p]);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    stroke(p, p); draw(); update(); ringShow(e);
  }
  function move(e) {
    ringShow(e);
    if (!E.drawing || !E.active || E.done || !E.strokes.length) return;
    e.preventDefault();
    const co = (e.nativeEvent.getCoalescedEvents && e.nativeEvent.getCoalescedEvents()) || [];
    for (const ev of co.length ? co : [e.nativeEvent]) {
      if (E.done) break;
      const p = pos(ev); E.strokes[E.strokes.length - 1].push(p); stroke(E.last, p); E.last = p;
    }
    draw(); update();
  }
  const up = (e) => { E.drawing = false; E.last = null; if (e) ringShow(e); };

  /* Sonido de fondo con fundido de entrada y salida: DEEP, TIDE o BOWL */
  function ensureAudio() {
    if (!E.audio) E.audio = new (window.AudioContext || window.webkitAudioContext)();
    if (E.audio.state === "suspended") E.audio.resume();
    return E.audio;
  }
  function startNoise(type, force) {
    if (!force && cfg.current.mode !== "STILL") return;
    try {
      const A = ensureAudio(); if (E.snd) return;
      const master = A.createGain(); master.gain.setValueAtTime(0, A.currentTime); master.gain.linearRampToValueAtTime(1, A.currentTime + 1.5);
      master.connect(A.destination);
      E.snd = { master, ...buildSound(A, type || cfg.current.sound, master) };
    } catch { /* ignore */ }
  }
  function stopNoise() {
    try {
      const s = E.snd; if (!s) return;
      E.snd = null;
      const A = E.audio, t = A.currentTime;
      s.master.gain.cancelScheduledValues(t); s.master.gain.setValueAtTime(s.master.gain.value, t); s.master.gain.linearRampToValueAtTime(0, t + 0.6);
      s.stop(t + 0.7);
      setTimeout(() => { try { s.master.disconnect(); } catch { /* ignore */ } }, 900);
    } catch { /* ignore */ }
  }
  function preview(type) { // al elegir un sonido en el menú: muestra de ~3 s
    if (E.active) return;
    clearTimeout(E.prevT); stopNoise(); startNoise(type, true);
    E.prevT = setTimeout(stopNoise, 3200);
  }

  /* Pantalla encendida durante la sesión y pausa al cambiar de pestaña */
  async function acquireWake() {
    try {
      if (navigator.wakeLock && !E.wake) {
        E.wake = await navigator.wakeLock.request("screen");
        E.wake.addEventListener("release", () => { E.wake = null; });
      }
    } catch { /* ignore */ }
  }
  function releaseWake() { try { if (E.wake) E.wake.release(); } catch { /* ignore */ } E.wake = null; }
  function onVisibility() {
    if (document.hidden) { try { if (E.audio) E.audio.suspend(); } catch { /* ignore */ } releaseWake(); }
    else if (E.active) { if (cfg.current.mode === "STILL") { try { if (E.audio) E.audio.resume(); } catch { /* ignore */ } } acquireWake(); }
  }

  return {
    start() {
      clearTimers(); setGuide(false); clearTimeout(E.prevT); stopNoise(); E.figure = 1; E.active = true; E.shape = null; E.lastType = ""; E.lastCat = ""; setFade("1"); resize(); newFigure();
      if (cfg.current.mode === "STILL") startNoise();
      acquireWake();
    },
    exit() { clearTimers(); setGuide(false); E.token++; E.active = false; E.drawing = false; ringHide(); stopNoise(); releaseWake(); },
    destroy() { clearTimers(); clearTimeout(E.prevT); setGuide(false); E.token++; E.active = false; stopNoise(); releaseWake(); },
    hasProgress: () => E.figure > 1 || E.strokes.length > 0,
    leave: ringHide, resize, down, move, up, onVisibility, preview,
  };
}

/* ───────── Estilos (minimalismo original) ───────── */
const CSS = `
.still-root{--bg:#0d0d0f;--fg:#eeeef0;position:fixed;inset:0;background:var(--bg);color:var(--fg);font-family:Arial,Helvetica,sans-serif;overflow:hidden}
.still-root *{box-sizing:border-box}
.still-root button,.still-root textarea{font:inherit;color:inherit}
.still-root button{background:none;border:0;cursor:pointer}
.still-root .hidden{display:none!important}
.still-root :focus-visible{outline:1px solid #9a9ba1;outline-offset:3px;border-radius:2px}
.still-root .home{width:min(430px,100%);height:100%;margin:auto;padding:clamp(40px,10vh,90px) 28px clamp(70px,16vh,140px);display:flex;flex-direction:column;align-items:center;justify-content:center}
.still-root .menu-btn{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:14px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#a5a6ab;z-index:2;border-radius:50%;background:rgba(255,255,255,.04);transition:background .2s,color .2s}
.still-root .menu-btn:hover{color:#fff;background:rgba(255,255,255,.08)}
.still-root .menu-btn svg{width:22px;height:14px;display:block}
.still-root .logo{font-size:58px;font-weight:300;letter-spacing:.42em;padding-left:.42em;animation:still-breathe 4s ease-in-out infinite}
@keyframes still-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
.still-root .tagline{margin-top:34px;color:#a5a6ab;font-size:12px;letter-spacing:.28em;text-align:center;line-height:1.8;max-width:330px}
.still-root .mode-switch{margin-top:70px;display:flex;gap:24px;align-items:center;font-size:13px;letter-spacing:.30em}
.still-root .mode{color:#73747a;padding:4px 0 9px;position:relative}.still-root .mode.active{color:var(--fg)}
.still-root .mode.active:after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:#d8d8dc}
.still-root .dot{color:#55565c}
.still-root .start{margin-top:58px;min-width:170px;padding:0 20px;height:52px;border:1px solid #606168;letter-spacing:.34em;font-size:13px;transition:border-color .2s,background .2s}
.still-root .start:hover{border-color:#aaaab0;background:#121216}
.still-root .session-info{margin-top:30px;color:#85868d;font-size:11px;letter-spacing:.28em;text-align:center}
.still-root .overlay{position:fixed;inset:0;z-index:20;background:rgba(13,13,15,.985);display:flex;align-items:center;justify-content:center;padding:28px;animation:still-fade .25s ease}
@keyframes still-fade{from{opacity:0}to{opacity:1}}
.still-root .panel{width:min(430px,100%);max-height:90vh;overflow:auto;padding:56px 0 25px;scrollbar-width:thin;scrollbar-color:#2a2a2e transparent}.still-root .panel::-webkit-scrollbar{width:4px}.still-root .panel::-webkit-scrollbar-thumb{background:#2a2a2e;border-radius:2px}.still-root .panel::-webkit-scrollbar-track{background:transparent}
.still-root .panel-sm{width:min(360px,100%);text-align:center}
.still-root .close{position:absolute;top:14px;right:40px;left:auto;width:38px;height:38px;display:flex;align-items:center;justify-content:center;color:#888990;font-size:22px;border-radius:50%;background:rgba(255,255,255,.03);transition:background .2s,color .2s;z-index:5}.still-root .close:hover{color:#fff;background:rgba(255,255,255,.07)}
.still-root .panel-title{text-align:center;font-size:18px;font-weight:300;letter-spacing:.38em;padding-left:.38em;margin:0 0 45px}
.still-root .section-label{margin:28px 0 14px;color:#777980;font-size:12px;letter-spacing:.28em}
.still-root .setting-row{display:grid;grid-template-columns:1fr auto;align-items:center;padding:13px 0;border-bottom:1px solid #222329}
.still-root .setting-name{font-size:11px;letter-spacing:.25em}.still-root .stepper{display:flex;align-items:center;gap:14px}
.still-root .step{width:38px;height:38px;border:1px solid #4b4c52;color:#bbbcc1}.still-root .step:hover{border-color:#aaaab0}
.still-root .value{min-width:76px;text-align:center;font-size:11px;letter-spacing:.22em}
.still-root .lang-btn,.still-root .sound-btn{font-size:11px;letter-spacing:.22em;color:#73747a;padding:6px 2px 7px}
.still-root .lang-btn.active,.still-root .sound-btn.active{color:#fff;border-bottom:1px solid #d8d8dc}
.still-root .sound-block{padding:13px 0 15px;border-bottom:1px solid #222329}
.still-root .sound-opts{display:flex;justify-content:space-between;margin-top:12px}
.still-root .sound-desc{margin-top:10px;color:#66676d;font-size:10px;letter-spacing:.12em;line-height:1.7}
.still-root .menu-link{width:100%;padding:17px 0;text-align:left;border-bottom:1px solid #222329;color:#d0d0d4;font-size:11px;letter-spacing:.18em;transition:padding-left .15s}
.still-root .menu-link:hover{color:#fff;padding-left:5px}
.still-root .version{text-align:center;margin-top:38px;color:#56575d;font-size:11px;letter-spacing:.25em}
.still-root .copy{color:#a7a8ad;font-size:12px;line-height:1.9;letter-spacing:.06em;text-align:center}.still-root .copy strong{color:#eee;font-weight:400}
.still-root .textarea{width:100%;height:120px;resize:none;margin:26px 0 18px;padding:15px;border:1px solid #4a4b51;background:#111115;outline:none;font-size:13px;line-height:1.6}
.still-root .textarea:focus{border-color:#8d8e94}
.still-root .textarea:disabled,.still-root .primary:disabled{opacity:.5;cursor:default}
.still-root .cat-row{display:flex;gap:8px;margin-top:14px}
.still-root .cat-btn{flex:1;padding:10px 4px;border:1px solid #3a3b41;font-size:10px;letter-spacing:.1em;color:#73747a;text-align:center;transition:border-color .2s,color .2s}
.still-root .cat-btn.active{color:#fff;border-color:#aaaab0}
.still-root .fb-status{margin-top:18px;text-align:center;font-size:11px;letter-spacing:.1em;line-height:1.7}
.still-root .fb-status.success{color:#7a9a7a}
.still-root .fb-status.error{color:#9a7a7a}
.still-root .primary{width:100%;height:50px;border:1px solid #66676d;letter-spacing:.25em;font-size:11px}.still-root .primary:hover{background:#17171b;border-color:#aaaab0}
.still-root .back{display:block;margin:32px auto 0;color:#777980;font-size:11px;letter-spacing:.2em}
.still-root .support-note{margin-top:22px;color:#66676d;font-size:10px;line-height:1.7;text-align:center}
.still-root .panel-actions{display:flex;gap:10px;margin-top:34px}
.still-root .panel-actions button{flex:1;height:48px;border:1px solid #55565c;letter-spacing:.2em;font-size:10px}
.still-root .panel-actions button:hover{border-color:#aaaab0}
.still-root .game{position:fixed;inset:0;background:var(--bg);touch-action:none}
.still-root .game canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;opacity:1;transition:opacity .35s ease;cursor:none}
.still-root .cursor-ring{position:absolute;left:0;top:0;width:18px;height:18px;border:1px solid rgba(238,238,240,.8);border-radius:50%;pointer-events:none;opacity:0;transition:opacity .12s;will-change:transform}
.still-root .game-top{position:absolute;top:20px;left:0;right:0;text-align:center;pointer-events:none}
.still-root .progress{font-size:10px;letter-spacing:.25em;color:#777980}
.still-root .progress-track{width:120px;height:1px;background:#222329;margin:12px auto 0;overflow:hidden}
.still-root .progress-fill{height:100%;width:0%;background:#8f9096;transition:width .25s ease}
.still-root .game-exit{position:absolute;top:15px;right:20px;color:#65666c;font-size:20px}.still-root .game-exit:hover{color:#eee}
.still-root .game-bottom{position:absolute;bottom:22px;left:0;right:0;text-align:center;color:#55565c;font-size:9px;letter-spacing:.22em;pointer-events:none}
.still-root .finish{position:fixed;inset:0;z-index:30;background:rgba(13,13,15,.98);display:flex;align-items:center;justify-content:center;text-align:center;animation:still-fade .4s ease}
.still-root .finish h2{font-size:16px;font-weight:300;letter-spacing:.45em;padding-left:.45em;margin:0}
.still-root .finish p{font-size:11px;letter-spacing:.2em;color:#777980;margin:22px 0 42px;line-height:1.8}
.still-root .finish-actions{display:flex;gap:12px;justify-content:center}
.still-root .finish-actions button{border:1px solid #55565c;padding:13px 25px;font-size:10px;letter-spacing:.22em}.still-root .finish-actions button:hover{border-color:#aaaab0}
@media(max-height:650px){.still-root .home{padding-top:28px}.still-root .tagline{margin-top:20px}.still-root .mode-switch{margin-top:45px}.still-root .start{margin-top:38px}}
@media(prefers-reduced-motion:reduce){.still-root .logo,.still-root .overlay,.still-root .finish{animation:none}.still-root .game canvas,.still-root .start,.still-root .menu-link,.still-root .progress-fill,.still-root .cursor-ring{transition:none}}
`;

/* **negrita** y saltos de línea en los textos */
const rich = (s) => s.split("\n").map((line, i, arr) => (
  <React.Fragment key={i}>
    {line.split("**").map((seg, j) => (j % 2 ? <strong key={j}>{seg}</strong> : seg))}
    {i < arr.length - 1 && <br />}
  </React.Fragment>
));

/* ───────── Página ───────── */
export default function Home() {
  const [screen, setScreen] = useState("home"); // home | game | finish
  const [overlay, setOverlay] = useState(null);
  const [mode, setMode] = useState(() => (read(LS.mode, "STILL") === "SILENCE" ? "SILENCE" : "STILL"));
  const [sizeIndex, setSizeIndex] = useState(() => idx(read(LS.size, 1)));
  const [brushIndex, setBrushIndex] = useState(() => idx(read(LS.brush, 1)));
  const [sound, setSound] = useState(() => { const s = read(LS.sound, "deep"); return SOUNDS.includes(s) ? s : "deep"; });
  const [lang, setLang] = useState(() => {
    const s = read(LS.lang, "");
    if (s === "es" || s === "en") return s;
    return typeof navigator !== "undefined" && /^es/i.test(navigator.language || "") ? "es" : "en";
  });
  const [runId, setRunId] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackCat, setFeedbackCat] = useState("General Feedback");
  const [feedbackState, setFeedbackState] = useState("idle");
  const t = T[lang];

  const canvasRef = useRef(null), textRef = useRef(null), fillRef = useRef(null), ringRef = useRef(null);
  const cfg = useRef({ mode, sizeIndex, brushIndex, sound, t });
  cfg.current = { mode, sizeIndex, brushIndex, sound, t };

  const eng = useRef(null);
  if (!eng.current && typeof document !== "undefined") {
    eng.current = createEngine({ canvasRef, textRef, fillRef, ringRef, cfg, ui: { finish: () => setScreen("finish") } });
  }

  useEffect(() => { write(LS.mode, mode); }, [mode]);
  useEffect(() => { write(LS.size, sizeIndex); write(LS.brush, brushIndex); }, [sizeIndex, brushIndex]);
  useEffect(() => { write(LS.sound, sound); }, [sound]);
  useEffect(() => { write(LS.lang, lang); document.documentElement.lang = lang; }, [lang]);

  useEffect(() => { if (read(LS.onboarded, "") !== "1") setOverlay("onboarding"); }, []);
  useEffect(() => { if (overlay !== "feedback") setFeedbackState("idle"); }, [overlay]);

  useEffect(() => {
    const onResize = () => eng.current.resize(), onVis = () => eng.current.onVisibility();
    window.addEventListener("resize", onResize); document.addEventListener("visibilitychange", onVis); onResize();
    return () => { window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis); eng.current.destroy(); };
  }, []);

  useEffect(() => { if (screen === "game") eng.current.start(); }, [screen, runId]);

  useEffect(() => {
    if (screen !== "game") return;
    const block = (e) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [screen]);

  const startGame = () => { setOverlay(null); setScreen("game"); setRunId((n) => n + 1); };
  const doExit = () => { eng.current.exit(); setOverlay(null); setScreen("home"); };
  const tryExit = () => (eng.current.hasProgress() ? setOverlay("confirmExit") : doExit());
  const closeOverlay = () => setOverlay(null);
  const finishOnboarding = () => { write(LS.onboarded, "1"); setOverlay(null); };
  const pickSound = (s) => { setSound(s); eng.current.preview(s); };

  const sendFeedback = async () => {
    if (feedbackState === "sending" || feedbackState === "success") return;
    const m = feedbackMsg.trim();
    if (!m) return;
    try { const last = parseInt(read("still_fb_last", "0"), 10); if (Date.now() - last < 30000) { setFeedbackState("cooldown"); return; } } catch {}
    setFeedbackState("sending");
    try {
      const res = await base44.functions.invoke("submitFeedback", { message: m, category: feedbackCat });
      if (res.data && res.data.success) { try { write("still_fb_last", String(Date.now())); } catch {} setFeedbackState("success"); setFeedbackMsg(""); }
      else setFeedbackState("error");
    } catch { setFeedbackState("error"); }
  };
  const openPaypal = () => {
    if (PAYPAL_DONATION_URL.startsWith("http")) window.open(PAYPAL_DONATION_URL, "_blank", "noopener,noreferrer");
    else alert(t.paypalMissing);
  };

  const Close = ({ label }) => <button className="close" aria-label={label || t.aClose} onClick={closeOverlay}>×</button>;
  const link = (id, text) => <button className="menu-link" onClick={() => setOverlay(id)}>{text}</button>;
  const modeLabel = (m) => (m === "STILL" ? t.still : t.silence);

  return (
    <div className="still-root">
      <style>{CSS}</style>

      {/* HOME */}
      <main className={screen === "home" ? "" : "hidden"} style={{ position: "fixed", inset: 0 }}>
        <button className="menu-btn" aria-label={t.aOpenMenu} onClick={() => setOverlay("menu")}>
          <svg viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M1 1h20M1 7h20M1 13h20" /></svg>
        </button>
        <div className="home">
          <div className="logo">STILL</div>
          <div className="tagline">{t.tagline}</div>
          <div className="mode-switch">
            <button className={"mode" + (mode === "STILL" ? " active" : "")} aria-pressed={mode === "STILL"} onClick={() => setMode("STILL")}>{t.still}</button>
            <span className="dot">·</span>
            <button className={"mode" + (mode === "SILENCE" ? " active" : "")} aria-pressed={mode === "SILENCE"} onClick={() => setMode("SILENCE")}>{t.silence}</button>
          </div>
          <button className="start" onClick={startGame}>{t.start}</button>
          <div className="session-info">{mode === "STILL" ? t.infoStill : t.infoSilence}</div>
        </div>
      </main>

      {/* JUEGO (el canvas permanece montado; se oculta fuera de partida) */}
      <section className={"game" + (screen === "game" ? "" : " hidden")}>
        <canvas ref={canvasRef}
          onPointerDown={(e) => eng.current.down(e)} onPointerMove={(e) => eng.current.move(e)}
          onPointerUp={(e) => eng.current.up(e)} onPointerCancel={() => eng.current.up()} onPointerLeave={() => eng.current.leave()} />
        <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
        <div className="game-top">
          <div ref={textRef} className="progress">01 / 20</div>
          <div className="progress-track"><div ref={fillRef} className="progress-fill" /></div>
        </div>
        <button className="game-exit" aria-label={t.aExit} onClick={tryExit}>×</button>
        <div className="game-bottom">{modeLabel(mode)}</div>
      </section>

      {/* FINAL */}
      {screen === "finish" && (
        <section className="finish"><div>
          <h2>STILL</h2>
          <p>{rich(t.finish)}</p>
          <div className="finish-actions">
            <button onClick={startGame}>{t.again}</button>
            <button onClick={() => setScreen("home")}>{t.home}</button>
          </div>
        </div></section>
      )}

      {/* OVERLAYS */}
      {overlay === "onboarding" && (
        <section className="overlay"><div className="panel panel-sm">
          <h2 className="panel-title">{t.welcome}</h2>
          <div className="copy">{rich(t.welcomeCopy)}</div>
          <div className="panel-actions"><button onClick={finishOnboarding}>{t.begin}</button></div>
        </div></section>
      )}

      {overlay === "confirmExit" && (
        <section className="overlay"><div className="panel panel-sm">
          <h2 className="panel-title">{t.leave}</h2>
          <div className="copy">{t.leaveCopy}</div>
          <div className="panel-actions"><button onClick={closeOverlay}>{t.keep}</button><button onClick={doExit}>{t.exit}</button></div>
        </div></section>
      )}

      {overlay === "menu" && (
        <section className="overlay"><div className="panel">
          <Close label={t.aCloseMenu} /><h2 className="panel-title">{t.options}</h2>
          <div className="section-label">{t.gameSettings}</div>
          <div className="setting-row"><div className="setting-name">{t.size}</div><div className="stepper">
            <button className="step" aria-label={t.aDecSize} onClick={() => setSizeIndex((i) => Math.max(0, i - 1))}>−</button>
            <span className="value">{t.levels[sizeIndex]}</span>
            <button className="step" aria-label={t.aIncSize} onClick={() => setSizeIndex((i) => Math.min(2, i + 1))}>+</button>
          </div></div>
          <div className="setting-row"><div className="setting-name">{t.brush}</div><div className="stepper">
            <button className="step" aria-label={t.aDecBrush} onClick={() => setBrushIndex((i) => Math.max(0, i - 1))}>−</button>
            <span className="value">{t.levels[brushIndex]}</span>
            <button className="step" aria-label={t.aIncBrush} onClick={() => setBrushIndex((i) => Math.min(2, i + 1))}>+</button>
          </div></div>
          <div className="sound-block">
            <div className="setting-name">{t.sound}</div>
            <div className="sound-opts">
              {SOUNDS.map((s) => (
                <button key={s} className={"sound-btn" + (sound === s ? " active" : "")} aria-pressed={sound === s} onClick={() => pickSound(s)}>{t.sounds[s]}</button>
              ))}
            </div>
            <div className="sound-desc">{t.soundDesc[sound]}</div>
          </div>
          <div className="setting-row"><div className="setting-name">{t.language}</div><div className="stepper">
            <button className={"lang-btn" + (lang === "en" ? " active" : "")} aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
            <button className={"lang-btn" + (lang === "es" ? " active" : "")} aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
          </div></div>
          <div className="section-label">{t.information}</div>
          {link("help", t.howItWorks)}{link("feedback", t.feedback)}{link("support", t.support)}{link("about", t.about)}{link("privacy", t.privacy)}
          <div className="version">v1.0.0</div>
        </div></section>
      )}

      {overlay === "help" && (
        <section className="overlay"><div className="panel">
          <Close /><h2 className="panel-title">{t.howItWorks}</h2>
          <div className="copy">{t.help.map((p, i) => <p key={i}>{rich(p)}</p>)}</div>
          <button className="back" onClick={closeOverlay}>{t.done}</button>
        </div></section>
      )}

      {overlay === "feedback" && (
        <section className="overlay"><div className="panel">
          <Close /><h2 className="panel-title">{t.feedback}</h2>
          <div className="copy">{t.feedbackCopy}</div>
          <div className="section-label" style={{ marginTop: "26px" }}>{t.feedbackCategory}</div>
          <div className="cat-row">
            <button className={"cat-btn" + (feedbackCat === "Suggestion" ? " active" : "")} onClick={() => setFeedbackCat("Suggestion")}>{t.categories.suggestion}</button>
            <button className={"cat-btn" + (feedbackCat === "Bug Report" ? " active" : "")} onClick={() => setFeedbackCat("Bug Report")}>{t.categories.bug}</button>
            <button className={"cat-btn" + (feedbackCat === "General Feedback" ? " active" : "")} onClick={() => setFeedbackCat("General Feedback")}>{t.categories.general}</button>
          </div>
          <textarea className="textarea" placeholder={t.placeholder} aria-label={t.aFeedback} value={feedbackMsg} onChange={(e) => setFeedbackMsg(e.target.value)} maxLength={2000} disabled={feedbackState === "sending" || feedbackState === "success"} />
          <button className="primary" onClick={sendFeedback} disabled={!feedbackMsg.trim() || feedbackState === "sending" || feedbackState === "success"}>{feedbackState === "sending" ? t.feedbackSending : t.send}</button>
          {feedbackState === "success" && <div className="fb-status success">{t.feedbackSuccess}</div>}
          {feedbackState === "error" && <div className="fb-status error">{t.feedbackError}</div>}
          {feedbackState === "cooldown" && <div className="fb-status error">{t.feedbackCooldown}</div>}
        </div></section>
      )}

      {overlay === "support" && (
        <section className="overlay"><div className="panel">
          <Close /><h2 className="panel-title">{t.support}</h2>
          <div className="copy">{t.supportCopy.map((p, i) => <p key={i}>{p}</p>)}</div>
          <button className="primary" onClick={openPaypal}>{t.support}</button>
          <div className="support-note">{t.supportNote}</div>
        </div></section>
      )}

      {overlay === "about" && (
        <section className="overlay"><div className="panel">
          <Close /><h2 className="panel-title">{t.aboutTitle}</h2>
          <div className="copy">{t.aboutCopy.map((p, i) => <p key={i}>{rich(p)}</p>)}</div>
          <div className="version">v1.0.0</div>
        </div></section>
      )}

      {overlay === "privacy" && (
        <section className="overlay"><div className="panel">
          <Close /><h2 className="panel-title">{t.privacy}</h2>
          <div className="copy">{t.privacyCopy.map((p, i) => <p key={i}>{p}</p>)}</div>
        </div></section>
      )}
    </div>
  );
}