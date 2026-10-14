import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FIGURES, buildMask } from '@/lib/figures';
import { startAmbient, setAudioIntensity, stopAmbient } from '@/lib/audio';
import { getLang, t } from '@/lib/i18n';

const N = 110; // resolución de la grilla de cobertura
const STILL_TOTAL = 20;
const COMPLETE_AT = 1;

const SIZES = {
  small: { factor: 0.5 },
  medium: { factor: 0.68 },
  large: { factor: 0.86 },
};
const SIZE_ORDER = ['small', 'medium', 'large'];

const BRUSH = { small: 4, medium: 9, large: 16 };
const BRUSH_ORDER = ['small', 'medium', 'large'];

export default function Play() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') === 'silence' ? 'silence' : 'still';
  const [size, setSize] = useState(() => {
    const s = params.get('size');
    return SIZES[s] ? s : 'medium';
  });
  const [brush, setBrush] = useState(() => {
    const b = params.get('brush');
    return BRUSH[b] ? b : 'medium';
  });
  const [lang, setLang] = useState(getLang);
  const L = t();
  const switchLang = (l) => {
    if (l === lang) return;
    localStorage.setItem('still_lang', l);
    setLang(l);
  };

  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const wrapRef = useRef(null);
  const maskCanvasRef = useRef(null);  // máscara alta resolución para recorte suave
  const shadeCanvasRef = useRef(null);  // capa de sombreado (trazos crudos)
  const tempCanvasRef = useRef(null);   // capa temporal de composición

  const [index, setIndex] = useState(1); // 1-based
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Estado mutable del juego (no provoca re-render).
  const g = useRef({
    mask: null, interior: 0,
    covered: null, coveredCount: 0, outsideCount: 0,
    box: { l: 0, t: 0, size: 0, s: 0 },
    fig: null, figIndex: 0,
    drawing: false, lastX: 0, lastY: 0,
    fading: false, audioOn: false,
    scores: [],
  });

  // Récord local
  useEffect(() => {
    if (mode === 'still') {
      const hs = Number(localStorage.getItem('still_highscore') || 0);
      setHighScore(hs);
    }
  }, [mode]);

  // Redibuja la escena: contorno de la figura + sombreado recortado por la máscara.
  const drawOutline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { box, fig } = g.current;
    const w = canvas._cssW || canvas.width;
    const h = canvas._cssH || canvas.height;
    ctx.clearRect(0, 0, w, h);

    // contorno más visible
    ctx.save();
    ctx.translate(box.l + box.size / 2, box.t + box.size / 2);
    ctx.scale(box.s, box.s);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.016;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    fig.path(ctx);
    ctx.stroke();
    ctx.restore();

    // sombreado recortado por la máscara (bordes suaves siguiendo la figura)
    const sc = shadeCanvasRef.current, mc = maskCanvasRef.current, tc = tempCanvasRef.current;
    if (!sc || !mc || !tc) return;
    const tctx = tc.getContext('2d');
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, tc.width, tc.height);
    tctx.drawImage(sc, 0, 0);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(mc, 0, 0);
    tctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tc, box.l, box.t, box.size, box.size);
  }, []);

  const setupFigure = useCallback((figIndex, sizeKey) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas._cssW || canvas.width;
    const h = canvas._cssH || canvas.height;
    const base = Math.min(w, h);
    const boxSize = base * SIZES[sizeKey].factor;
    const s = boxSize / 2;
    const l = (w - boxSize) / 2;
    const t = (h - boxSize) / 2;

    // En STILL se usan las 20 primeras figuras (progresión simple->compleja).
    // En SILENCE se ciclan las 32.
    const fig = mode === 'still'
      ? FIGURES[figIndex % STILL_TOTAL]
      : FIGURES[figIndex % FIGURES.length];

    const { mask, interior } = buildMask(fig, N);

    // canvases auxiliares (se crean una sola vez)
    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement('canvas');
    if (!shadeCanvasRef.current) shadeCanvasRef.current = document.createElement('canvas');
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(boxSize * dpr);

    // máscara alta resolución: área rellenable de la figura
    const mc = maskCanvasRef.current;
    mc.width = mc.height = px;
    const mctx = mc.getContext('2d');
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, boxSize, boxSize);
    mctx.translate(boxSize / 2, boxSize / 2);
    mctx.scale(s, s);
    mctx.fillStyle = '#fff';
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 0.16;
    mctx.lineJoin = 'round';
    mctx.lineCap = 'round';
    fig.path(mctx);
    if (fig.type === 'fill') mctx.fill(fig.fillRule || 'nonzero');
    else mctx.stroke();

    // capa de sombreado (trazos crudos, sin recortar)
    const sc = shadeCanvasRef.current;
    sc.width = sc.height = px;
    const sctx = sc.getContext('2d');
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, boxSize, boxSize);
    sctx.lineJoin = 'round';
    sctx.lineCap = 'round';

    const tc = tempCanvasRef.current;
    tc.width = tc.height = px;

    const st = g.current;
    st.mask = mask;
    st.interior = interior;
    st.covered = new Uint8Array(N * N);
    st.coveredCount = 0;
    st.outsideCount = 0;
    st.box = { l, t, size: boxSize, s };
    st.fig = fig;
    st.figIndex = figIndex;
    st.fading = false;
    drawOutline();
    setAudioIntensity(1); // ruido al aparecer la figura
  }, [mode, drawOutline]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    // reconfigurar en coords CSS
    canvas._cssW = w; canvas._cssH = h;
    // reconstruir figura actual con el nuevo tamaño
    setupFigure(g.current.figIndex, size);
  }, [setupFigure, size]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ---- cobertura ----
  const markPoint = (px, py, pencilPx) => {
    const st = g.current;
    const { box, mask, covered } = st;
    const gx = ((px - box.l) / box.size) * N;
    const gy = ((py - box.t) / box.size) * N;
    const gr = (pencilPx / box.size) * N;
    const r = Math.ceil(gr);
    const cx = Math.round(gx), cy = Math.round(gy);
    const x0 = Math.max(0, cx - r), x1 = Math.min(N - 1, cx + r);
    const y0 = Math.max(0, cy - r), y1 = Math.min(N - 1, cy + r);
    const gr2 = gr * gr;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - gx, dy = y - gy;
        if (dx * dx + dy * dy > gr2) continue;
        const idx = y * N + x;
        if (covered[idx]) continue;
        covered[idx] = 1;
        if (mask[idx]) st.coveredCount++;
        else st.outsideCount++;
      }
    }
  };

  const drawSegment = (x1, y1, x2, y2, pencilPx) => {
    const sc = shadeCanvasRef.current;
    if (!sc) return;
    const sctx = sc.getContext('2d');
    const { box } = g.current;
    // trazo sólido y continuo (sin estela): opaco, ancho constante
    sctx.strokeStyle = 'rgba(228,229,233,0.96)';
    sctx.lineWidth = pencilPx * 2;
    sctx.beginPath();
    sctx.moveTo(x1 - box.l, y1 - box.t);
    sctx.lineTo(x2 - box.l, y2 - box.t);
    sctx.stroke();
    // cobertura
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 3));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      markPoint(x1 + dx * t, y1 + dy * t, pencilPx);
    }
    drawOutline(); // redibuja contorno + sombreado recortado
  };

  const coverage = () => {
    const st = g.current;
    if (!st.interior) return 0;
    return st.coveredCount / st.interior;
  };

  const figureScore = () => {
    const st = g.current;
    const cov = st.interior ? st.coveredCount / st.interior : 0;
    const total = st.coveredCount + st.outsideCount;
    const outsideRatio = total ? st.outsideCount / total : 0;
    return Math.max(0, Math.min(1, cov * (1 - 0.4 * outsideRatio)));
  };

  const nextFigure = () => {
    const st = g.current;
    if (mode === 'still') {
      if (st.figIndex + 1 >= STILL_TOTAL) {
        // sesión completa
        const avg = st.scores.length ? st.scores.reduce((a, b) => a + b, 0) / st.scores.length : 0;
        const score = Math.round(avg * 100);
        setFinalScore(score);
        if (score > highScore) {
          localStorage.setItem('still_highscore', String(score));
          setHighScore(score);
        }
        stopAmbient();
        setFinished(true);
        return;
      }
      const ni = st.figIndex + 1;
      setIndex(ni + 1);
      setupFigure(ni, size);
    } else {
      const ni = st.figIndex + 1;
      setIndex(ni + 1);
      setupFigure(ni, size);
    }
  };

  const completeFigure = () => {
    const st = g.current;
    if (st.fading) return;
    st.fading = true;
    st.drawing = false;
    if (mode === 'still') st.scores.push(figureScore());
    setAudioIntensity(0.04);
    const canvas = canvasRef.current;
    canvas.style.transition = 'opacity 480ms ease';
    canvas.style.opacity = '0';
    setTimeout(() => {
      canvas.style.opacity = '1';
      nextFigure();
    }, 560);
  };

  // ---- puntero ----
  const insideFigure = (px, py) => {
    const st = g.current;
    if (!st.mask) return false;
    const gx = Math.floor(((px - st.box.l) / st.box.size) * N);
    const gy = Math.floor(((py - st.box.t) / st.box.size) * N);
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) return false;
    return st.mask[gy * N + gx] === 1;
  };

  const updateCursor = (px, py, drawing, pointerType) => {
    const el = cursorRef.current;
    if (!el) return;
    const inside = insideFigure(px, py);
    const show = pointerType === 'touch' ? drawing : true;
    if (!show) { el.style.opacity = '0'; return; }
    el.style.opacity = '1';
    el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
    el.classList.toggle('pencil', inside);
    el.classList.toggle('dot', !inside);
  };

  const onPointerDown = (e) => {
    if (g.current.fading || finished) return;
    if (!g.current.audioOn) { startAmbient(); g.current.audioOn = true; }
    g.current.drawing = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    g.current.lastX = px; g.current.lastY = py;
    canvasRef.current.setPointerCapture(e.pointerId);
    const pencilPx = BRUSH[brush];
    drawSegment(px, py, px, py, pencilPx);
    setAudioIntensity(1 - coverage());
    updateCursor(px, py, true, e.pointerType);
  };

  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const st = g.current;
    updateCursor(px, py, st.drawing, e.pointerType);
    if (!st.drawing || st.fading || finished) return;
    const pencilPx = BRUSH[brush];
    drawSegment(st.lastX, st.lastY, px, py, pencilPx);
    st.lastX = px; st.lastY = py;
    const cov = coverage();
    setAudioIntensity(1 - cov);
    if (cov >= COMPLETE_AT) completeFigure();
  };

  const onPointerUp = (e) => {
    g.current.drawing = false;
    if (e.pointerType === 'touch' && cursorRef.current) cursorRef.current.style.opacity = '0';
  };

  const cycleSize = (dir) => {
    const i = SIZE_ORDER.indexOf(size);
    const next = SIZE_ORDER[(i + dir + SIZE_ORDER.length) % SIZE_ORDER.length];
    setSize(next);
    setupFigure(g.current.figIndex, next);
  };

  const cycleBrush = (dir) => {
    const i = BRUSH_ORDER.indexOf(brush);
    setBrush(BRUSH_ORDER[(i + dir + BRUSH_ORDER.length) % BRUSH_ORDER.length]);
  };

  const restart = () => {
    g.current.scores = [];
    setFinished(false);
    setIndex(1);
    setupFigure(0, size);
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: '#0D0D0F', cursor: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={(e) => { if (cursorRef.current) cursorRef.current.style.opacity = '0'; g.current.drawing = false; }}
        style={{ touchAction: 'none', display: 'block' }}
        className="absolute inset-0"
      />

      {/* Cursor de lápiz / punto */}
      <div
        ref={cursorRef}
        className="pointer-events-none absolute top-0 left-0"
        style={{ opacity: 0, willChange: 'transform' }}
      >
        <PencilCursor />
      </div>

      {/* HUD */}
      {!finished && (
        <>
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white tracking-[0.4em] text-[10px] sm:text-xs" style={{ fontWeight: 300 }}>
            {mode === 'still' ? L.still : L.silence}
          </div>
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 sm:gap-3">
            <span className="text-white/70 text-[9px] sm:text-[10px] tracking-[0.3em] uppercase">{L.size}</span>
            <button onClick={() => cycleSize(-1)} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-white border border-white/30 hover:border-white transition-colors text-xs sm:text-sm">−</button>
            <span className="text-white text-[9px] sm:text-[10px] tracking-[0.2em] w-11 sm:w-14 text-center">{L.sizeLabels[size]}</span>
            <button onClick={() => cycleSize(1)} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-white border border-white/30 hover:border-white transition-colors text-xs sm:text-sm">+</button>
          </div>

          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex flex-col gap-2 items-start">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.3em]">
              <button onClick={() => switchLang('en')} className={lang === 'en' ? 'text-white' : 'text-white/40'}>EN</button>
              <span className="text-white/30">·</span>
              <button onClick={() => switchLang('es')} className={lang === 'es' ? 'text-white' : 'text-white/40'}>ES</button>
            </div>
            <button
              onClick={() => { stopAmbient(); navigate('/'); }}
              className="text-white/70 text-[9px] sm:text-[10px] tracking-[0.3em] uppercase hover:text-white transition-colors"
            >
              {L.exit}
            </button>
          </div>

          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 sm:gap-3">
            <span className="text-white/70 text-[9px] sm:text-[10px] tracking-[0.3em] uppercase">{L.brush}</span>
            <button onClick={() => cycleBrush(-1)} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-white border border-white/30 hover:border-white transition-colors text-xs sm:text-sm">−</button>
            <span className="text-white text-[9px] sm:text-[10px] tracking-[0.2em] w-11 sm:w-14 text-center">{L.brushLabels[brush]}</span>
            <button onClick={() => cycleBrush(1)} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-white border border-white/30 hover:border-white transition-colors text-xs sm:text-sm">+</button>
          </div>
        </>
      )}

      {/* Pantalla de resultado (solo STILL) */}
      {finished && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: '#0D0D0F' }}
        >
          <p className="text-white/70 tracking-[0.3em] text-xs uppercase mb-6" style={{ fontWeight: 300 }}>{L.sessionDone}</p>
          <p className="text-white tracking-[0.1em]" style={{ fontSize: 'clamp(3.5rem, 14vw, 7rem)', fontWeight: 200 }}>
            {finalScore}<span className="text-white/60 text-3xl align-top ml-1">%</span>
          </p>
          <p className="text-white/50 tracking-[0.25em] text-[10px] uppercase mt-4">
            {L.record} {highScore}%
          </p>
          <div className="mt-14 flex flex-col items-center gap-5">
            <button
              onClick={restart}
              className="text-white tracking-[0.4em] text-xs uppercase border border-white/40 px-10 py-3 hover:border-white transition-colors"
              style={{ fontWeight: 300 }}
            >
              {L.again}
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-white/60 text-[10px] tracking-[0.3em] uppercase hover:text-white transition-colors"
            >
              {L.home}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PencilCursor() {
  return (
    <>
      {/* lápiz (dentro de la figura) */}
      <svg className="pencil-ui" width="22" height="22" viewBox="0 0 22 22" style={{ display: 'none' }}>
        <line x1="3" y1="19" x2="17" y2="5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="3" y1="19" x2="5" y2="17" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {/* punto (fuera de la figura) */}
      <div className="dot-ui" style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF', display: 'none' }} />
      <style>{`
        .pencil .pencil-ui { display: block !important; }
        .dot .dot-ui { display: block !important; }
      `}</style>
    </>
  );
}