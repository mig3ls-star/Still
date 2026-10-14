// STILL — definición de figuras geométricas.
// Todas son figuras cerradas con un interior rellenable (type:'fill').
// Se trazan en coordenadas normalizadas (centro 0,0, radio 1).
// fillRule 'evenodd' para figuras con huecos (anillo, engranaje).

const TAU = Math.PI * 2;

// Helpers de trazo (NO llaman a beginPath: cada figura lo hace una vez al inicio).
function poly(ctx, n, rot = -Math.PI / 2, r = 1) {
  for (let i = 0; i < n; i++) {
    const a = rot + (TAU * i) / n;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function star(ctx, p, oR, iR, rot = -Math.PI / 2) {
  const N = p * 2;
  for (let i = 0; i < N; i++) {
    const a = rot + (TAU * i) / N;
    const r = i % 2 ? iR : oR;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function circ(ctx, cx, cy, r) {
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, TAU);
}
function rect(ctx, r) {
  ctx.rect(-r, -r, 2 * r, 2 * r);
}

export const FIGURES = [
  // polígonos básicos
  { name: 'círculo', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, 0, 0, 1); } },
  { name: 'cuadrado', type: 'fill', path: ctx => { ctx.beginPath(); rect(ctx, 1); } },
  { name: 'triángulo', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 3); } },
  { name: 'rombo', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 4, 0); } },
  { name: 'pentágono', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 5); } },
  { name: 'hexágono', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 6, 0); } },
  { name: 'heptágono', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 7); } },
  { name: 'octágono', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 8); } },
  { name: 'nonágono', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 9); } },
  { name: 'decágono', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 10); } },
  // formas derivadas
  { name: 'rectángulo', type: 'fill', path: ctx => { ctx.beginPath(); ctx.rect(-1, -0.6, 2, 1.2); } },
  { name: 'trapecio', type: 'fill', path: ctx => { ctx.beginPath(); ctx.moveTo(-1, 0.6); ctx.lineTo(1, 0.6); ctx.lineTo(0.65, -0.6); ctx.lineTo(-0.65, -0.6); ctx.closePath(); } },
  { name: 'óvalo', type: 'fill', path: ctx => { ctx.beginPath(); ctx.ellipse(0, 0, 1, 0.62, 0, 0, TAU); } },
  { name: 'anillo', type: 'fill', fillRule: 'evenodd', path: ctx => { ctx.beginPath(); circ(ctx, 0, 0, 1); circ(ctx, 0, 0, 0.55); } },
  // estrellas
  { name: 'estrella 4', type: 'fill', path: ctx => { ctx.beginPath(); star(ctx, 4, 1, 0.42); } },
  { name: 'estrella 5', type: 'fill', path: ctx => { ctx.beginPath(); star(ctx, 5, 1, 0.45); } },
  { name: 'estrella 6', type: 'fill', path: ctx => { ctx.beginPath(); star(ctx, 6, 1, 0.55); } },
  { name: 'estrella 8', type: 'fill', path: ctx => { ctx.beginPath(); star(ctx, 8, 1, 0.7); } },
  { name: 'estrella 12', type: 'fill', path: ctx => { ctx.beginPath(); star(ctx, 12, 1, 0.78); } },
  { name: 'hexagrama', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 3, -Math.PI / 2, 1); poly(ctx, 3, Math.PI / 2, 1); } },
  // cruces
  { name: 'cruz', type: 'fill', path: ctx => { ctx.beginPath(); rect(ctx, 1); rect(ctx, 0.32); } },
  { name: 'cruz diagonal', type: 'fill', path: ctx => { ctx.beginPath(); ctx.save(); ctx.rotate(Math.PI / 4); rect(ctx, 1); rect(ctx, 0.32); ctx.restore(); } },
  // flores y rosetas
  { name: 'flor 6', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, 0, 0, 0.3); for (let i = 0; i < 6; i++) { const a = (TAU * i) / 6; circ(ctx, Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.4); } } },
  { name: 'flor 8', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, 0, 0, 0.28); for (let i = 0; i < 8; i++) { const a = (TAU * i) / 8; circ(ctx, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.34); } } },
  { name: 'sol', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, 0, 0, 0.5); for (let i = 0; i < 12; i++) { const a = (TAU * i) / 12; const w = 0.14; const a1 = a - w, a2 = a + w; ctx.moveTo(Math.cos(a1) * 0.5, Math.sin(a1) * 0.5); ctx.lineTo(Math.cos(a1) * 1, Math.sin(a1) * 1); ctx.lineTo(Math.cos(a) * 1.05, Math.sin(a) * 1.05); ctx.lineTo(Math.cos(a2) * 1, Math.sin(a2) * 1); ctx.lineTo(Math.cos(a2) * 0.5, Math.sin(a2) * 0.5); ctx.closePath(); } } },
  { name: 'cuatro hojas', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, 0, -0.5, 0.55); circ(ctx, 0.5, 0, 0.55); circ(ctx, 0, 0.5, 0.55); circ(ctx, -0.5, 0, 0.55); } },
  { name: 'trébol', type: 'fill', path: ctx => { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (TAU * i) / 3; circ(ctx, Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.55); } } },
  { name: 'vesica', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, -0.4, 0, 0.8); circ(ctx, 0.4, 0, 0.8); } },
  { name: 'círculos superpuestos', type: 'fill', path: ctx => { ctx.beginPath(); circ(ctx, -0.5, 0, 0.65); circ(ctx, 0.5, 0, 0.65); circ(ctx, 0, 0.55, 0.65); } },
  // compuestos geométricos
  { name: 'panal', type: 'fill', path: ctx => { ctx.beginPath(); poly(ctx, 6, 0, 0.5); for (let i = 0; i < 6; i++) { const a = (TAU * i) / 6; ctx.save(); ctx.translate(Math.cos(a) * 0.85, Math.sin(a) * 0.85); poly(ctx, 6, 0, 0.5); ctx.restore(); } } },
  { name: 'rejilla', type: 'fill', path: ctx => { ctx.beginPath(); for (const x of [-0.6, 0, 0.6]) for (const y of [-0.6, 0, 0.6]) circ(ctx, x, y, 0.26); } },
  { name: 'engranaje', type: 'fill', fillRule: 'evenodd', path: ctx => { ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (TAU * i) / 12; const w = 0.13; const a1 = a - w, a2 = a + w; ctx.moveTo(Math.cos(a1) * 0.8, Math.sin(a1) * 0.8); ctx.lineTo(Math.cos(a1) * 1, Math.sin(a1) * 1); ctx.lineTo(Math.cos(a2) * 1, Math.sin(a2) * 1); ctx.lineTo(Math.cos(a2) * 0.8, Math.sin(a2) * 0.8); ctx.closePath(); } circ(ctx, 0, 0, 0.8); circ(ctx, 0, 0, 0.4); } },
];

// Construye la máscara rellenable en una grilla N×N.
// Devuelve { mask: Uint8Array(N*N), interior: número de celdas rellenables }.
export function buildMask(fig, N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  ctx.translate(N / 2, N / 2);
  ctx.scale(N / 2, N / 2);
  ctx.fillStyle = '#fff';
  fig.path(ctx);
  ctx.fill(fig.fillRule || 'nonzero');

  const data = ctx.getImageData(0, 0, N, N).data;
  const mask = new Uint8Array(N * N);
  let interior = 0;
  for (let i = 0; i < N * N; i++) {
    if (data[i * 4 + 3] > 40) { mask[i] = 1; interior++; }
  }
  return { mask, interior };
}