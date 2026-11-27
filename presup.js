// Presupuestos: arma el PDF y la vista HTML con el diseño de los bocetos de Canva.
// Lo usan la app (index.html) y la página pública para el cliente (presupuesto.html).

const FB = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/';
const FUENTES = { tit: 'Poppins-SemiBold.ttf', reg: 'Poppins-Regular.ttf', ita: 'Poppins-LightItalic.ttf', itb: 'Poppins-Italic.ttf', bold: 'Poppins-SemiBold.ttf' };
const CREMA = [255, 251, 243], CAJA = [192, 178, 152], CAJA2 = [165, 147, 113], INK = [0, 0, 0];

export const pesos = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR') + '.-';
export const fechaTxt = f => { if (!f) return ''; const [y, m, d] = f.split('-').map(Number); return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`; };

let jsPDFp = null;
export function cargarJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return jsPDFp || (jsPDFp = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'; s.onload = () => ok(window.jspdf.jsPDF); s.onerror = () => { jsPDFp = null; no(new Error('No se pudo cargar el generador de PDF.')); }; document.head.appendChild(s); }));
}
const cache = {};
async function fuentes(pdf) {
  for (const [k, f] of Object.entries(FUENTES)) {
    if (!cache[k]) { const b = new Uint8Array(await (await fetch(FB + f)).arrayBuffer()); let t = ''; for (let i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); cache[k] = btoa(t); }
    pdf.addFileToVFS(k + '.ttf', cache[k]); pdf.addFont(k + '.ttf', k, 'normal');
  }
}
const imgSize = src => new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok([0, 0]); i.src = src; });

// Datos del encabezado del cliente, en tres renglones como en Canva
export function lineasCliente(p) {
  return [
    `Cliente: ${p.cliente || ''}   Tel: ${p.tel || ''}`,
    `Fecha: ${fechaTxt(p.fecha)}   hora: ${p.hora || ''}`,
    `Invitados: ${p.invitados || ''}   Sector: ${p.sector || ''} - Menú: ${p.menuTipo || ''}`,
  ];
}
export function lineasPrecio(p) {
  if ((p.precio?.modo || 'dos') === 'uno') return {
    bold: [`VALOR POR PERSONA ${pesos(p.precioEf)}* (precio promocional pagando en efectivo)`],
    ita: ['(*) En caso de abonar con tarjeta de crédito, débito, transferencia bancaria o requerir Factura A, se deberá SUMAR el IVA correspondiente (21%).'],
  };
  return {
    bold: [`Pagando en efectivo valor por persona ${pesos(p.precioEf)}*`, `Pagando con otros medios de pago valor por persona ${pesos(p.precioOtros)}*`],
    ita: ['Formas de pago: crédito 1 pago, débito, transferencia bancaria.', '(*) En caso de requerir Factura A, se deberá SUMAR el IVA correspondiente (21%).'],
  };
}
export const CONDICIONES = 'El valor del presupuesto tiene una validez de 5 días corridos; vencido dicho plazo, la cotización deberá ser actualizada. Para confirmar la fecha del evento, se deberá abonar una seña mínima del 50% del valor total. El saldo restante podrá cancelarse en dólares estadounidenses o en pesos argentinos calculados al tipo de cambio "compra dólar MEP" vigente al día de abonarlo.';
export const MENORES = 'Precio menores: 0 a 3 años: sin cargo / 4 a 13 años: 50% del valor de la tarjeta de adulto / desde 14 años: tarjeta completa (valor adulto).';
export const propinaTxt = p => `Propina no incluida: la propina destinada a nuestro equipo de trabajo (${pesos(p.propina)}) es de carácter obligatorio y se cobrará de manera anticipada. ¡Desde ya, muchas gracias por su comprensión!`;

// ---------- PDF ----------
export async function presupPDF(p, logos = {}) {
  // Si no entra en una hoja, achica un poco la letra (como harías en Canva)
  let pdf;
  for (const K of [1, 0.94, 0.88, 0.83, 0.78]) { pdf = await armar(p, logos, K); if (pdf.getNumberOfPages() === 1) break; }
  return pdf;
}
async function armar(p, logos, K) {
  const JS = await cargarJsPDF();
  const W = 210, H = p.formato === 'largo' ? 350 : 297, M = 6, CW = W - 2 * M;
  const pdf = new JS({ unit: 'mm', format: [W, H] });
  await fuentes(pdf);
  const LH = 1.24 * 0.3528; // mm por punto
  const fondo = () => { pdf.setFillColor(...CREMA); pdf.rect(0, 0, W, H, 'F'); };
  const pie = () => { pdf.setFont('reg', 'normal'); pdf.setFontSize(12); pdf.setTextColor(...INK); pdf.text('Falucho N.º 32', M + 18, H - 7, { align: 'center' }); pdf.text('Cabo Corrientes', W / 2, H - 7, { align: 'center' }); pdf.text('Mar del Plata', W - M - 18, H - 7, { align: 'center' }); };
  fondo();
  // Logos
  const logo = async (src, cx, maxW, maxH, y) => { if (!src) return; const [iw, ih] = await imgSize(src); if (!iw) return; let w = maxW, h = w * ih / iw; if (h > maxH) { h = maxH; w = h * iw / ih; } pdf.addImage(src, 'PNG', cx - w / 2, y + (maxH - h) / 2, w, h); };
  if (p.marca === 'ambos') { await logo(logos.villa, 52, 62, 10, 7); await logo(logos.mara, W - 58, 78, 9, 7.5); }
  else if (p.marca === 'villa') await logo(logos.villa, W / 2, 66, 11, 6);
  else await logo(logos.mara, W / 2, 84, 9.5, 7.5);
  // Nombre del presupuesto (ej: una empresa)
  let dy = 0;
  if (String(p.titulo || '').trim()) { pdf.setFont('tit', 'normal'); pdf.setFontSize(17); pdf.setTextColor(...INK); pdf.text(String(p.titulo).trim().toUpperCase(), W / 2, 27, { align: 'center', charSpace: 0.4 }); dy = 11; }
  // Caja del cliente
  pdf.setFillColor(...CAJA); pdf.setDrawColor(...INK); pdf.setLineWidth(0.28); pdf.rect(M - 3.7, 19 + dy, CW + 7.4 - 0.6, 24, 'FD');
  pdf.setFont('tit', 'normal'); pdf.setFontSize(14); pdf.setTextColor(...INK);
  lineasCliente(p).forEach((t, i) => pdf.text(t, W / 2, 26 + dy + i * 6.3, { align: 'center' }));
  let y = 53 + dy;
  const nuevaPag = () => { pdf.addPage([W, H]); fondo(); y = 14; };
  const espacio = need => { if (y + need > H - 16) { pie(); nuevaPag(); } };
  const subrayado = (t, x, yy, size, font = 'tit') => { pdf.setFont(font, 'normal'); pdf.setFontSize(size); pdf.text(t, x, yy); const w = pdf.getTextWidth(t); pdf.setLineWidth(0.25); pdf.line(x, yy + 0.9, x + w, yy + 0.9); };
  const parrafo = (t, size = 10.3 * K, font = 'ita', indent = 0) => {
    pdf.setFont(font, 'normal'); pdf.setFontSize(size); pdf.setTextColor(...INK);
    for (const para of String(t || '').split('\n')) { const ls = pdf.splitTextToSize(para, CW - indent); for (const l of ls) { espacio(size * LH + 0.5); pdf.text(l, M + indent, y); y += size * LH; } }
  };
  for (const b of p.bloques || []) {
    if (b.tipo === 'menu') {
      espacio(14); pdf.setFont('tit', 'normal'); pdf.setFontSize(14 * K); pdf.text(b.titulo || 'EL MENÚ:', W / 2, y, { align: 'center' }); y += 7 * K;
      for (const it of b.items || []) { espacio(12); if (it.t) { subrayado(it.t, M, y, 13 * K); y += 5.2 * K; } parrafo(it.x); y += 4.5 * K; }
    } else if (b.tipo === 'seccion') {
      espacio(12); if (b.titulo) { subrayado(b.titulo, M, y, 12 * K); y += 5 * K; }
      for (const it of b.items || []) { if (it.t) { espacio(8); pdf.setFont('tit', 'normal'); pdf.setFontSize(11 * K); pdf.text(it.t, M, y); y += 4.6 * K; } parrafo(it.x); y += 1.5 * K; }
      y += 3 * K;
    } else if (b.tipo === 'texto') {
      espacio(12); subrayado(b.titulo, M, y, 12 * K); y += 5 * K; parrafo(b.x); y += 4.5 * K;
    } else if (b.tipo === 'lista') {
      const its = (b.items || []).filter(Boolean); if (!its.length) continue;
      espacio(12); subrayado(b.titulo, M, y, 12 * K); y += 5 * K;
      for (const it of its) { const yy = y; parrafo(it, 10.3 * K, 'ita', 5); pdf.setFillColor(...INK); pdf.circle(M + 1.8, yy - 1.2, 0.6, 'F'); }
      y += 4 * K;
    }
  }
  // Recuadros finales: propina, nota y precios
  const caja = (lineas, fill) => {
    const pad = 2.6; let h = pad * 2; const rows = [];
    for (const [t, font, size, align] of lineas) { pdf.setFont(font, 'normal'); pdf.setFontSize(size); const ls = pdf.splitTextToSize(t, CW - 8); rows.push([ls, font, size, align]); h += ls.length * size * 0.3528 * 1.4; }
    espacio(h + 3);
    if (fill) pdf.setFillColor(...fill); pdf.setDrawColor(...INK); pdf.setLineWidth(0.28); pdf.rect(M - 3.7, y, CW + 6.8, h, fill ? 'FD' : 'S');
    let yy = y + pad + 3.2;
    for (const [ls, font, size, align] of rows) { pdf.setFont(font, 'normal'); pdf.setFontSize(size); for (const l of ls) { if (align === 'left') pdf.text(l, M + 1, yy); else pdf.text(l, W / 2, yy, { align: 'center' }); if (font === 'bold' && align === 'left') { const w = pdf.getTextWidth(l); pdf.line(M + 1, yy + .8, M + 1 + w, yy + .8); } yy += size * 0.3528 * 1.4; } }
    y += h + 3.5;
  };
  y += 1;
  caja([[propinaTxt(p), 'reg', 10.6 * K, 'c']]);
  if (p.nota) caja([[p.nota, 'reg', 10.6 * K, 'c']]);
  const pr = lineasPrecio(p);
  const F = 9.6 * K; caja([...pr.bold.map(t => [t, 'bold', 11.4 * K, 'c']), ...pr.ita.map(t => [t, 'itb', F, 'c']), ['CONDICIONES DE PAGO', 'bold', F, 'left'], [CONDICIONES, 'itb', F, 'left'], ...(p.menores ? [[MENORES, 'itb', F, 'left']] : []), ...(p.extraPago ? [[p.extraPago, 'itb', F, 'left']] : [])], CAJA2);
  pie();
  return pdf;
}

// ---------- HTML (vista en la app y página del cliente) ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const br = s => esc(s).replace(/\n/g, '<br>');
export const PRESUP_CSS = `@font-face{font-family:PpT;font-weight:600;src:url(${FB}Poppins-SemiBold.ttf)}@font-face{font-family:PpT;font-weight:400;src:url(${FB}Poppins-Regular.ttf)}@font-face{font-family:PpI;font-style:italic;font-weight:300;src:url(${FB}Poppins-LightItalic.ttf)}@font-face{font-family:PpI;font-style:italic;font-weight:400;src:url(${FB}Poppins-Italic.ttf)}
.pz{background:#fffbf3;color:#000;max-width:794px;margin:0 auto;padding:22px 16px 18px;font:300 italic 14px/1.24 PpI,sans-serif;box-shadow:0 2px 14px #0002}
.pz-h{display:flex;justify-content:center;align-items:center;gap:30px;margin-bottom:14px;min-height:40px}.pz-h img{max-height:38px;max-width:60%}.pz-h.amb{justify-content:space-between;padding:0 10px}.pz-h.amb img{max-width:44%}
.pz-t{text-align:center;font:600 normal 23px PpT,sans-serif;text-transform:uppercase;letter-spacing:.04em;margin:-4px 0 12px}.pz-c{background:#c0b298;border:1px solid #000;text-align:center;font:600 normal 18px/1.35 PpT,sans-serif;padding:12px 8px;margin:0 -6px 20px}
.pz h4{font:600 normal 18px PpT,sans-serif;text-align:center;margin:0 0 10px}.pz h5{font:600 normal 17px PpT,sans-serif;text-decoration:underline;margin:14px 0 2px}.pz h6{font:600 normal 15px PpT,sans-serif;margin:6px 0 1px}
.pz p{margin:0}.pz ul{margin:2px 0 0;padding-left:20px}.pz li{margin:1px 0}
.pz-b{border:1px solid #000;text-align:center;font:400 normal 14px/1.4 PpT,sans-serif;padding:6px 10px;margin:14px -6px 0}
.pz-p{background:#a59371;border:1px solid #000;padding:10px 12px;margin:14px -6px 0;font:400 italic 12.6px/1.4 PpI,sans-serif}.pz-p b{display:block;text-align:center;font:600 normal 15.4px/1.4 PpT,sans-serif}.pz-p .c{text-align:center}.pz-p u{display:block;font:600 normal 12.6px PpT,sans-serif;margin-top:10px}
.pz-f{display:flex;justify-content:space-between;font:400 normal 16px PpT,sans-serif;margin-top:22px;padding:0 8px}
@media(max-width:600px){.pz{font-size:13px;padding:16px 10px}.pz-c{font-size:14px}.pz h5{font-size:15px}.pz-f{font-size:12px}}`;
export function presupHTML(p, logos = {}) {
  const h = p.marca === 'ambos' ? `<div class="pz-h amb">${logos.villa ? `<img src="${logos.villa}" alt="Villa Aluminé">` : ''}${logos.mara ? `<img src="${logos.mara}" alt="Mara Social Club">` : ''}</div>`
    : `<div class="pz-h">${(p.marca === 'villa' ? logos.villa : logos.mara) ? `<img src="${p.marca === 'villa' ? logos.villa : logos.mara}" alt="">` : `<b style="font:600 24px PpT">${p.marca === 'villa' ? 'Villa Aluminé' : 'MARA SOCIAL CLUB'}</b>`}</div>`;
  let s = `<div class="pz">${h}${String(p.titulo || '').trim() ? `<div class="pz-t">${esc(String(p.titulo).trim())}</div>` : ''}<div class="pz-c">${lineasCliente(p).map(esc).join('<br>')}</div>`;
  for (const b of p.bloques || []) {
    if (b.tipo === 'menu') { s += `<h4>${esc(b.titulo || 'EL MENÚ:')}</h4>` + (b.items || []).map(it => `${it.t ? `<h5>${esc(it.t)}</h5>` : ''}<p>${br(it.x)}</p>`).join(''); }
    else if (b.tipo === 'seccion') { s += `${b.titulo ? `<h5>${esc(b.titulo)}</h5>` : ''}` + (b.items || []).map(it => `${it.t ? `<h6>${esc(it.t)}</h6>` : ''}<p>${br(it.x)}</p>`).join(''); }
    else if (b.tipo === 'texto') s += `<h5>${esc(b.titulo)}</h5><p>${br(b.x)}</p>`;
    else if (b.tipo === 'lista') { const its = (b.items || []).filter(Boolean); if (its.length) s += `<h5>${esc(b.titulo)}</h5><ul>${its.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`; }
  }
  const pr = lineasPrecio(p);
  s += `<div class="pz-b">${esc(propinaTxt(p))}</div>${p.nota ? `<div class="pz-b">${esc(p.nota)}</div>` : ''}
  <div class="pz-p">${pr.bold.map(t => `<b>${esc(t)}</b>`).join('')}${pr.ita.map(t => `<div class="c">${esc(t)}</div>`).join('')}<u>CONDICIONES DE PAGO</u><div>${esc(CONDICIONES)}</div>${p.menores ? `<div style="margin-top:6px">${esc(MENORES)}</div>` : ''}${p.extraPago ? `<div style="margin-top:6px">${esc(p.extraPago)}</div>` : ''}</div>
  <div class="pz-f"><span>Falucho N.º 32</span><span>Cabo Corrientes</span><span>Mar del Plata</span></div></div>`;
  return s;
}
export const nombrePDF = p => ('presupuesto-' + (p.titulo || p.cliente || 'cliente') + '-' + (p.fecha || '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
