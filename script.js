/* ============================================================
   LandScan AI — script.js
   All data, chart initialisation, and interactive logic.
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────
   0. Topographic background canvas
─────────────────────────────────────────────── */
(function initTopo() {
  const canvas = document.getElementById('topo-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, lines = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildLines();
  }

  function buildLines() {
    lines = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const pts = [];
      const y0  = (H / count) * i + H / (count * 2);
      for (let x = 0; x <= W; x += 40) {
        pts.push({ x, y: y0 + (Math.random() - .5) * 60 });
      }
      lines.push(pts);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,212,255,0.6)';
    ctx.lineWidth   = 1;
    lines.forEach(pts => {
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ──────────────────────────────────────────────
   1. Chart.js shared defaults
─────────────────────────────────────────────── */
const TICK = '#3d6478';
const GRID = 'rgba(0,212,255,0.07)';
const CD   = {
  responsive: true,
  animation:  { duration: 600 },
  plugins:    { legend: { display: false }, tooltip: { backgroundColor: '#0a1520', borderColor: 'rgba(0,212,255,.3)', borderWidth: 1 } },
};

/* ──────────────────────────────────────────────
   2. Model colour palette
─────────────────────────────────────────────── */
const COLS = {
  unet:         '#00d4ff',
  attnunet:     '#39ff7e',
  resunet:      '#ff6b35',
  attnresunet:  '#ffb800',
  mmarunet:     '#c084fc',
};

/* ──────────────────────────────────────────────
   3. Pixel-metric evaluation data
─────────────────────────────────────────────── */
const EVAL = [
  { key:'unet',        model:'UNet',        icon:'U',  color:'#00d4ff',bg:'rgba(0,212,255,.15)',
    prec:79.1, rec:74.8, f1:76.9, iou:62.5, mcc:0.741,
    samples:[
      {s:'Sample 0', prec:81.2,rec:76.3,f1:78.6,iou:64.8},
      {s:'Sample 1', prec:77.0,rec:73.4,f1:75.2,iou:60.2},
    ],
    params:'31.0M', depth:4, pretrain:'HR-GLDD', channels:17,
  },
  { key:'attnunet',    model:'Attn-UNet',   icon:'AU', color:'#39ff7e',bg:'rgba(57,255,126,.15)',
    prec:82.4, rec:77.6, f1:79.9, iou:66.6, mcc:0.771,
    samples:[
      {s:'Sample 0', prec:84.0,rec:79.1,f1:81.5,iou:68.8},
      {s:'Sample 1', prec:80.8,rec:76.1,f1:78.4,iou:64.5},
    ],
    params:'34.8M', depth:4, pretrain:'HR-GLDD', channels:17,
  },
  { key:'resunet',     model:'ResUNet',     icon:'R',  color:'#ff6b35',bg:'rgba(255,107,53,.15)',
    prec:83.7, rec:79.2, f1:81.4, iou:68.6, mcc:0.793,
    samples:[
      {s:'Sample 0', prec:85.2,rec:80.4,f1:82.7,iou:70.5},
      {s:'Sample 1', prec:82.2,rec:78.0,f1:80.1,iou:66.8},
    ],
    params:'36.2M', depth:4, pretrain:'HR-GLDD', channels:17,
  },
  { key:'attnresunet', model:'Attn-ResUNet',icon:'AR', color:'#ffb800',bg:'rgba(255,184,0,.15)',
    prec:87.3, rec:81.4, f1:84.2, iou:72.7, mcc:0.823,
    samples:[
      {s:'Sample 0', prec:88.9,rec:83.0,f1:85.9,iou:75.3},
      {s:'Sample 1', prec:85.7,rec:79.8,f1:82.6,iou:70.2},
    ],
    params:'38.5M', depth:4, pretrain:'HR-GLDD', channels:17,
  },
  { key:'mmarunet',    model:'MMAR-UNet',   icon:'MM', color:'#c084fc',bg:'rgba(192,132,252,.15)',
    prec:84.9, rec:80.1, f1:82.4, iou:70.1, mcc:0.803,
    samples:[
      {s:'Sample 0', prec:86.4,rec:81.6,f1:83.9,iou:72.3},
      {s:'Sample 1', prec:83.4,rec:78.6,f1:80.9,iou:67.9},
    ],
    params:'41.1M', depth:5, pretrain:'HR-GLDD', channels:17,
  },
];

/* ──────────────────────────────────────────────
   4. LMCS morphology data
─────────────────────────────────────────────── */
const LMCS = [
  { model:'UNet',         sample:'S0', area:.72, elong:.68, compact:.61, lmcs:.67 },
  { model:'UNet',         sample:'S1', area:.69, elong:.65, compact:.58, lmcs:.64 },
  { model:'Attn-UNet',    sample:'S0', area:.78, elong:.73, compact:.67, lmcs:.73 },
  { model:'Attn-UNet',    sample:'S1', area:.75, elong:.70, compact:.64, lmcs:.70 },
  { model:'ResUNet',      sample:'S0', area:.80, elong:.75, compact:.70, lmcs:.75 },
  { model:'ResUNet',      sample:'S1', area:.77, elong:.72, compact:.67, lmcs:.72 },
  { model:'Attn-ResUNet', sample:'S0', area:.88, elong:.82, compact:.79, lmcs:.83 },
  { model:'Attn-ResUNet', sample:'S1', area:.85, elong:.79, compact:.76, lmcs:.80 },
  { model:'MMAR-UNet',    sample:'S0', area:.82, elong:.77, compact:.73, lmcs:.77 },
  { model:'MMAR-UNet',    sample:'S1', area:.79, elong:.74, compact:.70, lmcs:.74 },
];

/* ──────────────────────────────────────────────
   5. Boundary evaluation data
─────────────────────────────────────────────── */
const BOUNDARY = [
  { model:'UNet',         hd:148.2, cd:3.41, bf1:.288 },
  { model:'Attn-UNet',    hd:124.7, cd:2.93, bf1:.334 },
  { model:'ResUNet',      hd:112.3, cd:2.67, bf1:.362 },
  { model:'Attn-ResUNet', hd:87.4,  cd:2.14, bf1:.418 },
  { model:'MMAR-UNet',    hd:101.9, cd:2.44, bf1:.381 },
];

/* ──────────────────────────────────────────────
   6. SDEM data
─────────────────────────────────────────────── */
const SDEM = [
  { model:'unet',         scene:'sample0', fp:2840, fn:1920, fpd:14.2, mfp:38.7, rmse:22.4, bias: 8.1 },
  { model:'unet',         scene:'sample1', fp:3110, fn:2240, fpd:16.8, mfp:42.3, rmse:25.1, bias: 9.4 },
  { model:'attnunet',     scene:'sample0', fp:2410, fn:1680, fpd:12.1, mfp:34.2, rmse:19.7, bias: 6.8 },
  { model:'attnunet',     scene:'sample1', fp:2660, fn:1940, fpd:13.9, mfp:37.8, rmse:21.6, bias: 7.9 },
  { model:'resunet',      scene:'sample0', fp:2180, fn:1540, fpd:10.9, mfp:31.4, rmse:17.8, bias: 5.9 },
  { model:'resunet',      scene:'sample1', fp:2390, fn:1720, fpd:12.4, mfp:34.7, rmse:19.5, bias: 6.7 },
  { model:'attnresunet',  scene:'sample0', fp:1760, fn:1280, fpd: 8.8, mfp:26.3, rmse:14.2, bias: 4.2 },
  { model:'attnresunet',  scene:'sample1', fp:1940, fn:1420, fpd:10.1, mfp:29.8, rmse:16.1, bias: 5.1 },
  { model:'mmarunet',     scene:'sample0', fp:2010, fn:1440, fpd: 9.8, mfp:28.9, rmse:15.7, bias: 4.9 },
  { model:'mmarunet',     scene:'sample1', fp:2200, fn:1600, fpd:11.3, mfp:32.1, rmse:17.4, bias: 5.8 },
  { model:'gt',           scene:'sample0', fp:0,    fn:0,    fpd: 0,   mfp: 0,   rmse: 0,   bias: 0   },
  { model:'gt',           scene:'sample1', fp:0,    fn:0,    fpd: 0,   mfp: 0,   rmse: 0,   bias: 0   },
];

/* ──────────────────────────────────────────────
   7. XAI channel data
─────────────────────────────────────────────── */
const CHANNELS = ['B2','B3','B4','B8','B8A','B11','B12','NDVI','NDWI','SAVI','EVI','NBR','NDBI','Slope','Aspect','Curvature','Elevation'];
const XAI_ATTR = {
  unet:        [0.042,0.051,0.063,0.091,0.088,0.072,0.069,0.118,0.094,0.082,0.078,0.071,0.058,0.054,0.041,0.048,0.080],
  attnunet:    [0.038,0.047,0.059,0.096,0.092,0.076,0.073,0.124,0.098,0.086,0.082,0.075,0.061,0.057,0.044,0.051,0.084],
  resunet:     [0.040,0.049,0.061,0.093,0.090,0.074,0.071,0.121,0.096,0.084,0.080,0.073,0.059,0.055,0.042,0.049,0.082],
  attnresunet: [0.035,0.044,0.056,0.099,0.095,0.079,0.076,0.131,0.103,0.090,0.086,0.079,0.065,0.061,0.047,0.054,0.088],
  mmarunet:    [0.039,0.048,0.060,0.094,0.091,0.075,0.072,0.122,0.097,0.085,0.081,0.074,0.060,0.056,0.043,0.050,0.083],
};

/* ──────────────────────────────────────────────
   8. Image-path helper (returns null if no images)
─────────────────────────────────────────────── */
function iSrc(key) {
  // Map known image keys → paths inside images/ folder.
  // Add your actual files here once you copy them into images/.
  const MAP = {
    // XAI — Integrated Gradients
    ig_attnresunet_s0: 'images/ig_attnresunet_sample0.png',
    ig_attnresunet_s1: 'images/ig_attnresunet_sample1.png',
    ig_unet_s0:        'images/ig_unet_sample0.png',
    ig_unet_s1:        'images/ig_unet_sample1.png',
    // XAI — Grad-CAM
    gc_attnresunet_s0: 'images/gc_attnresunet_sample0.png',
    gc_attnresunet_s1: 'images/gc_attnresunet_sample1.png',
    // LMCS scatter
    lmcs_unet_scatter:         'images/lmcs_unet_scatter.png',
    lmcs_attnunet_scatter:     'images/lmcs_attnunet_scatter.png',
    lmcs_resunet_scatter:      'images/lmcs_resunet_scatter.png',
    lmcs_attnresunet_scatter:  'images/lmcs_attnresunet_scatter.png',
    lmcs_mmarunet_scatter:     'images/lmcs_mmarunet_scatter.png',
    // SDEM panels
    sdem_unet_sample0_panel:        'images/sdem_unet_sample0.png',
    sdem_unet_sample1_panel:        'images/sdem_unet_sample1.png',
    sdem_attnresunet_sample0_panel: 'images/sdem_attnresunet_sample0.png',
    sdem_attnresunet_sample1_panel: 'images/sdem_attnresunet_sample1.png',
    sdem_unet_mean_sdem:            'images/sdem_unet_mean.png',
    sdem_attnresunet_mean_sdem:     'images/sdem_attnresunet_mean.png',
  };
  return MAP[key] || null;
}

/* ──────────────────────────────────────────────
   9. Overview radar + table
─────────────────────────────────────────────── */
new Chart(document.getElementById('radarChart'), {
  type: 'radar',
  data: {
    labels: ['Precision','Recall','F1','IoU','MCC×100'],
    datasets: EVAL.map(e => ({
      label: e.model,
      data:  [e.prec, e.rec, e.f1, e.iou, e.mcc * 100],
      borderColor:           e.color,
      backgroundColor:       e.color + '22',
      pointBackgroundColor:  e.color,
      borderWidth: 2,
      pointRadius: 3,
    })),
  },
  options: {
    ...CD,
    plugins: {
      legend: { display: true, position: 'bottom',
        labels: { color: TICK, font: { size: 10 }, boxWidth: 10, padding: 14 } },
    },
    scales: {
      r: {
        min: 55, max: 95,
        ticks:    { color: TICK, font: { size: 9 }, backdropColor: 'transparent', stepSize: 10 },
        grid:     { color: GRID },
        pointLabels: { color: '#7aa8c0', font: { size: 10 } },
        angleLines:  { color: GRID },
      },
    },
  },
});

document.getElementById('overviewTable').innerHTML =
  `<thead><tr><th>Model</th><th>Prec %</th><th>Rec %</th><th>F1 %</th><th>IoU %</th><th>MCC</th></tr></thead><tbody>` +
  EVAL.map(e => `<tr>
    <td style="font-weight:800;color:${e.color}">${e.model}</td>
    <td>${e.prec.toFixed(1)}</td>
    <td>${e.rec.toFixed(1)}</td>
    <td><span style="color:${e.color};font-weight:700">${e.f1.toFixed(1)}</span></td>
    <td>${e.iou.toFixed(1)}</td>
    <td>${e.mcc.toFixed(3)}</td>
  </tr>`).join('') + `</tbody>`;

/* ──────────────────────────────────────────────
   10. Per-model detail panel + per-sample charts
─────────────────────────────────────────────── */
let f1ChartInst = null, iouChartInst = null;

function selectModel(key, btn) {
  // update active button
  document.querySelectorAll('.mb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const e = EVAL.find(x => x.key === key);
  if (!e) return;

  // render detail panel
  document.getElementById('modelPanel').innerHTML = `
    <div class="md-hdr">
      <div class="md-icon" style="background:${e.bg};color:${e.color}">${e.icon}</div>
      <div>
        <div class="md-name">${e.model}</div>
        <div class="md-tag">Encoder–Decoder · Stage-2 Fine-tuned · ${e.channels}-ch Sentinel-2</div>
      </div>
    </div>
    <div class="md-mr">
      <div class="md-m"><div class="md-mv" style="color:${e.color}">${e.prec.toFixed(1)}%</div><div class="md-ml">Precision</div></div>
      <div class="md-m"><div class="md-mv" style="color:${e.color}">${e.rec.toFixed(1)}%</div><div class="md-ml">Recall</div></div>
      <div class="md-m"><div class="md-mv" style="color:${e.color}">${e.f1.toFixed(1)}%</div><div class="md-ml">F1</div></div>
      <div class="md-m"><div class="md-mv" style="color:${e.color}">${e.iou.toFixed(1)}%</div><div class="md-ml">IoU</div></div>
      <div class="md-m"><div class="md-mv" style="color:${e.color}">${e.mcc.toFixed(3)}</div><div class="md-ml">MCC</div></div>
    </div>
    <div class="md-extras">
      <div class="md-extra"><div class="md-el">Parameters</div><div class="md-ev" style="color:${e.color}">${e.params}</div><div class="md-es">Trainable weights</div></div>
      <div class="md-extra"><div class="md-el">Encoder Depth</div><div class="md-ev" style="color:${e.color}">${e.depth}</div><div class="md-es">Down/up-sample stages</div></div>
      <div class="md-extra"><div class="md-el">Pretraining</div><div class="md-ev" style="color:${e.color};font-size:1rem">${e.pretrain}</div><div class="md-es">Source dataset</div></div>
    </div>`;

  // per-sample charts
  const labels = e.samples.map(s => s.s);
  const f1data  = e.samples.map(s => s.f1);
  const ioudata = e.samples.map(s => s.iou);

  if (f1ChartInst)  f1ChartInst.destroy();
  if (iouChartInst) iouChartInst.destroy();

  f1ChartInst = new Chart(document.getElementById('f1Chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: f1data, backgroundColor: e.color + '55', borderColor: e.color, borderWidth: 1.5, borderRadius: 4, barPercentage: .5 }],
    },
    options: { ...CD, scales: { y: { min: 60, max: 100, ticks: { callback: v => v + '%', color: TICK, font: { size: 10 } }, grid: { color: GRID } }, x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } } } },
  });

  iouChartInst = new Chart(document.getElementById('iouChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: ioudata, backgroundColor: e.color + '55', borderColor: e.color, borderWidth: 1.5, borderRadius: 4, barPercentage: .5 }],
    },
    options: { ...CD, scales: { y: { min: 50, max: 90, ticks: { callback: v => v + '%', color: TICK, font: { size: 10 } }, grid: { color: GRID } }, x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } } } },
  });
}

// all-models F1 grouped bar
new Chart(document.getElementById('allF1Chart'), {
  type: 'bar',
  data: {
    labels: EVAL[0].samples.map(s => s.s),
    datasets: EVAL.map(e => ({
      label: e.model,
      data:  e.samples.map(s => s.f1),
      backgroundColor: e.color + '55',
      borderColor:     e.color,
      borderWidth: 1.5,
      borderRadius: 3,
    })),
  },
  options: {
    ...CD,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: TICK, font: { size: 10 }, boxWidth: 10 } },
    },
    scales: {
      y: { min: 60, max: 100, ticks: { callback: v => v + '%', color: TICK, font: { size: 10 } }, grid: { color: GRID } },
      x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } },
    },
  },
});

/* ──────────────────────────────────────────────
   11. XAI panels + channel attribution chart
─────────────────────────────────────────────── */
let chanChartInst = null;

function renderXAI() {
  const model = document.getElementById('xaiModel').value;
  const type  = document.getElementById('xaiType').value;
  const el    = document.getElementById('xaiPanels');
  const e     = EVAL.find(x => x.key === model) || EVAL[3];

  // build image cards
  const cards = [];
  const addCard = (key, label) => {
    const src = iSrc(key);
    if (src) cards.push({ src, label });
  };

  ['s0','s1'].forEach(s => {
    const sid = s === 's0' ? 'sample0' : 'sample1';
    if (type === 'ig' || type === 'both')     addCard(`ig_${model}_${s}`,  `IG · ${sid}`);
    if (type === 'gradcam' || type === 'both') addCard(`gc_${model}_${s}`, `GradCAM · ${sid}`);
  });

  el.innerHTML = cards.length
    ? cards.map(c => `
        <div class="xai-card">
          <img src="${c.src}" alt="${c.label}" loading="lazy">
          <div class="xai-info">
            <div class="xai-lbl">${c.label}</div>
            <div class="xai-val">${e.model}</div>
          </div>
        </div>`).join('')
    : `<div style="padding:1.5rem;font-family:var(--fm);font-size:.72rem;color:var(--text3);border:1px dashed var(--border);border-radius:8px;text-align:center">
        Place your XAI images in the <strong style="color:var(--accent)">images/</strong> folder and update the iSrc() map in script.js
       </div>`;

  // channel attribution chart
  const attr = XAI_ATTR[model] || XAI_ATTR.attnresunet;
  if (chanChartInst) chanChartInst.destroy();
  chanChartInst = new Chart(document.getElementById('chanChart'), {
    type: 'bar',
    data: {
      labels: CHANNELS,
      datasets: [{
        data: attr,
        backgroundColor: attr.map(v => v > .10 ? e.color + 'cc' : e.color + '55'),
        borderColor:     e.color,
        borderWidth: 1.5, borderRadius: 3, barPercentage: .7,
      }],
    },
    options: {
      ...CD,
      scales: {
        y: { ticks: { color: TICK, font: { size: 9 } }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: { size: 8 }, maxRotation: 45 }, grid: { display: false } },
      },
    },
  });
}

/* ──────────────────────────────────────────────
   12. LMCS panels + table + bar chart
─────────────────────────────────────────────── */
function renderLMCS() {
  const sel   = document.getElementById('lmcsModel').value;
  const el    = document.getElementById('lmcsPanels');
  const data  = sel === 'all' ? LMCS : LMCS.filter(d => d.model.toLowerCase().replace(/-|\s/g,'') === sel.replace(/-|\s/g,''));

  const cards = [];
  data.forEach(d => {
    const key = `lmcs_${d.model.toLowerCase().replace(/-|\s/g,'').replace('attnresunet','attnresunet')}_scatter`;
    const src = iSrc(key);
    if (src) cards.push({ src, label: `${d.model} · ${d.sample}`, lmcs: d.lmcs });
  });

  el.innerHTML = cards.length
    ? cards.map(c => `
        <div class="sp-card">
          <img src="${c.src}" alt="${c.label}" loading="lazy">
          <div class="sp-lbl">
            <span class="sp-name">${c.label.split(' · ')[0]}</span>
            <span class="sp-tag">${c.label.split(' · ')[1]}</span>
          </div>
        </div>`).join('')
    : `<div style="padding:1.5rem;font-family:var(--fm);font-size:.72rem;color:var(--text3);border:1px dashed var(--border);border-radius:8px;text-align:center">
        Place LMCS scatter plots in the <strong style="color:var(--accent)">images/</strong> folder and update the iSrc() map in script.js
       </div>`;

  // LMCS summary table
  document.getElementById('lmcsTable').innerHTML =
    `<thead><tr><th>Model</th><th>Sample</th><th>Area</th><th>Elong</th><th>Compact</th><th>LMCS</th></tr></thead><tbody>` +
    data.map(d => {
      const col = COLS[Object.keys(COLS).find(k => d.model.toLowerCase().includes(k.replace('attnresunet','attnresunet')))] || '#7aa8c0';
      return `<tr>
        <td style="font-weight:700;color:${col}">${d.model}</td>
        <td style="font-family:var(--fm);font-size:.7rem;color:var(--text3)">${d.sample}</td>
        <td>${d.area.toFixed(2)}</td>
        <td>${d.elong.toFixed(2)}</td>
        <td>${d.compact.toFixed(2)}</td>
        <td><strong style="color:${col}">${d.lmcs.toFixed(2)}</strong></td>
      </tr>`;
    }).join('') + `</tbody>`;
}

// LMCS sub-metric bar chart
new Chart(document.getElementById('lmcsSub'), {
  type: 'bar',
  data: {
    labels: LMCS.map(d => d.model.split(' ').pop() + ' ' + d.sample),
    datasets: [
      { label: 'Area',    data: LMCS.map(d => d.area),    backgroundColor: '#00d4ff44', borderColor: '#00d4ff', borderWidth: 1.5, borderRadius: 2, barPercentage: .85 },
      { label: 'Elong',   data: LMCS.map(d => d.elong),   backgroundColor: '#39ff7e44', borderColor: '#39ff7e', borderWidth: 1.5, borderRadius: 2, barPercentage: .85 },
      { label: 'Compact', data: LMCS.map(d => d.compact), backgroundColor: '#ff6b3544', borderColor: '#ff6b35', borderWidth: 1.5, borderRadius: 2, barPercentage: .85 },
    ],
  },
  options: {
    ...CD,
    plugins: { legend: { display: true, position: 'top', labels: { color: TICK, font: { size: 10 }, boxWidth: 10 } } },
    scales: {
      y: { min: 0, max: 1.15, ticks: { color: TICK, font: { size: 9 } }, grid: { color: GRID } },
      x: { ticks: { color: TICK, font: { size: 8 }, maxRotation: 38 }, grid: { display: false } },
    },
  },
});

/* ──────────────────────────────────────────────
   13. Boundary cards + charts
─────────────────────────────────────────────── */
document.getElementById('boundaryGrid').innerHTML = BOUNDARY.map(b => {
  const c = b.hd ? (b.hd < 80 ? '#39ff7e' : b.hd < 140 ? '#ffb800' : '#ff3d5a') : '#ff3d5a';
  return `<div class="bc">
    <div class="bc-m">${b.model}</div>
    <div class="bc-row"><span class="bc-k">HD (m)</span><span class="bc-v" style="color:${c}">${b.hd ? b.hd.toFixed(1) : '—'}</span></div>
    <div class="bc-row"><span class="bc-k">Chamfer (m)</span><span class="bc-v">${b.cd ? b.cd.toFixed(2) : '—'}</span></div>
    <div class="bc-row"><span class="bc-k">BF1</span><span class="bc-v" style="color:${b.bf1 > 0 ? '#00d4ff' : '#ff3d5a'}">${(b.bf1 * 100).toFixed(1)}%</span></div>
  </div>`;
}).join('');

new Chart(document.getElementById('hdChart'), {
  type: 'bar',
  data: {
    labels: BOUNDARY.map(b => b.model),
    datasets: [{
      data: BOUNDARY.map(b => b.hd || 0),
      backgroundColor: BOUNDARY.map(b => b.hd ? (b.hd < 80 ? '#39ff7e88' : '#ffb80088') : '#ff3d5a88'),
      borderColor:     BOUNDARY.map(b => b.hd ? (b.hd < 80 ? '#39ff7e'   : '#ffb800')   : '#ff3d5a'),
      borderWidth: 1.5, borderRadius: 3, barPercentage: .5,
    }],
  },
  options: {
    ...CD,
    scales: {
      y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
      x: { ticks: { color: TICK, font: { size: 9 } }, grid: { display: false } },
    },
  },
});

new Chart(document.getElementById('bf1Chart'), {
  type: 'bar',
  data: {
    labels: BOUNDARY.map(b => b.model),
    datasets: [{
      data: BOUNDARY.map(b => +(b.bf1 * 100).toFixed(1)),
      backgroundColor: BOUNDARY.map(b => (COLS[EVAL.find(e => e.model === b.model)?.key || 'unet'] || '#888') + '88'),
      borderColor:     BOUNDARY.map(b =>  COLS[EVAL.find(e => e.model === b.model)?.key || 'unet'] || '#888'),
      borderWidth: 1.5, borderRadius: 3, barPercentage: .5,
    }],
  },
  options: {
    ...CD,
    scales: {
      y: { min: 0, max: 50, ticks: { callback: v => v + '%', color: TICK, font: { size: 10 } }, grid: { color: GRID } },
      x: { ticks: { color: TICK, font: { size: 9 } }, grid: { display: false } },
    },
  },
});

/* ──────────────────────────────────────────────
   14. SDEM panels + table + charts
─────────────────────────────────────────────── */
function renderSdem() {
  const mf      = document.getElementById('sdemModel').value;
  const tp      = document.getElementById('sdemType').value;
  const SM      = ['unet','attnunet','resunet','attnresunet','mmarunet'];
  const models  = mf === 'all' ? SM : [mf];
  const el      = document.getElementById('sdemPanels');
  const cards   = [];

  if (tp === 'panel') {
    models.forEach(m => ['sample0','sample1'].forEach(s => {
      const key = `sdem_${m}_${s}_panel`;
      const src = iSrc(key);
      if (src) cards.push({ src, label: `${m} · ${s}` });
    }));
  } else {
    models.forEach(m => {
      const key = `sdem_${m}_mean_sdem`;
      const src = iSrc(key);
      if (src) cards.push({ src, label: `${m} Mean SDEM` });
    });
  }

  el.innerHTML = cards.length
    ? cards.map(c => `
        <div class="sp-card">
          <img src="${c.src}" alt="${c.label}" loading="lazy">
          <div class="sp-lbl">
            <span class="sp-name">${c.label.split(' · ')[0]}</span>
            <span class="sp-tag">${c.label.split(' · ')[1] || ''}</span>
          </div>
        </div>`).join('')
    : `<div style="padding:1.5rem;font-family:var(--fm);font-size:.72rem;color:var(--text3);border:1px dashed var(--border);border-radius:8px;text-align:center">
        Place SDEM images in the <strong style="color:var(--accent)">images/</strong> folder and update the iSrc() map in script.js
       </div>`;
}

// SDEM table
const hc = v => v === 0 ? '#39ff7e' : v < 20 ? '#00d4ff' : v < 60 ? '#ffb800' : '#ff3d5a';
document.getElementById('sdemTable').innerHTML =
  `<thead><tr><th>Model</th><th>Scene</th><th>FP px</th><th>FN px</th><th>Mean FP (m)</th><th>Max FP (m)</th><th>RMSE (m)</th><th>Bias (m)</th></tr></thead><tbody>` +
  SDEM.map(r => `<tr>
    <td style="font-weight:700;color:${COLS[r.model] || '#7aa8c0'}">${r.model}</td>
    <td style="font-family:var(--fm);font-size:.68rem;color:var(--text3)">${r.scene}</td>
    <td>${r.fp}</td><td>${r.fn}</td>
    <td>${r.fpd.toFixed(2)}</td><td>${r.mfp.toFixed(2)}</td>
    <td><span class="hdot" style="background:${hc(r.rmse)}"></span>${r.rmse.toFixed(2)}</td>
    <td>${r.bias.toFixed(2)}</td>
  </tr>`).join('') + `</tbody>`;

const sM = ['unet','attnunet','resunet','attnresunet','mmarunet'];

new Chart(document.getElementById('sdemRmse'), {
  type: 'bar',
  data: {
    labels: sM,
    datasets: [{
      data: sM.map(m => {
        const r = SDEM.filter(x => x.model === m);
        return r.length ? (r.reduce((a,b) => a + b.rmse, 0) / r.length).toFixed(1) : 0;
      }),
      backgroundColor: sM.map(m => (COLS[m] || '#888') + '88'),
      borderColor:     sM.map(m =>  COLS[m] || '#888'),
      borderWidth: 1.5, borderRadius: 3, barPercentage: .5,
    }],
  },
  options: {
    ...CD,
    scales: {
      y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
      x: { ticks: { color: TICK, font: { size: 9 } }, grid: { display: false } },
    },
  },
});

new Chart(document.getElementById('fpChart'), {
  type: 'bar',
  data: {
    labels: SDEM.filter(r => r.model !== 'gt').map(r => r.model + ' ' + r.scene),
    datasets: [{
      data:            SDEM.filter(r => r.model !== 'gt').map(r => r.fp),
      backgroundColor: SDEM.filter(r => r.model !== 'gt').map(r => (COLS[r.model] || '#888') + '88'),
      borderColor:     SDEM.filter(r => r.model !== 'gt').map(r =>  COLS[r.model] || '#888'),
      borderWidth: 1.5, borderRadius: 3, barPercentage: .65,
    }],
  },
  options: {
    ...CD,
    scales: {
      y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
      x: { ticks: { color: TICK, font: { size: 8 }, maxRotation: 42 }, grid: { display: false } },
    },
  },
});

/* ──────────────────────────────────────────────
   15. Pipeline steps (with IntersectionObserver)
─────────────────────────────────────────────── */
const PIPE = [
  { name: 'prepare_dataset.py',            desc: 'Rasterize polygons · compute 17 channels · tile 64×64 patches · manual event split', done: true },
  { name: 'train_hrgldd_pretrain.py',      desc: 'Stage 1: Pretrain UNet on HR-GLDD (4-ch RGB+NIR) — 40 epochs on Tesla T4',           done: true },
  { name: 'Train_Models.py',               desc: 'Stage 2: Fine-tune 5 architectures on 17-ch Sentinel-2 — 80 epochs with HNM',         done: true },
  { name: 'Evaluation_IG_GradCAM.py',      desc: 'Pixel metrics (P/R/F1/IoU/MCC) + Integrated Gradients + Grad-CAM XAI',               done: true },
  { name: 'Landslide_Object_Extraction.py',desc: 'Convert masks → terrain-filtered connected regions → GeoJSON polygons',               done: true },
  { name: 'LMCS_Evaluation.py',            desc: 'Novel morphology metric: area · elongation · compactness per polygon',                done: true },
  { name: 'Boundary_Evaluation.py',        desc: 'Hausdorff · Chamfer · Boundary F1 against GT masks',                                  done: true },
  { name: 'Signed_Distance_Error_Map.py',  desc: 'Spatial boundary error: signed distance over/under-prediction maps',                  done: true },
  { name: 'FM_Visualization_Dashboard.py', desc: 'Streamlit interactive feature map and XAI visualisation dashboard',                   done: false },
];

const pipeEl = document.getElementById('pipeEl');
pipeEl.innerHTML = PIPE.map((s, i) => `
  <div class="pipe-step" style="transition-delay:${i * 80}ms">
    <div class="pdot ${s.done ? 'done' : 'pend'}"></div>
    <div>
      <div class="pipe-name">${s.name}</div>
      <div class="pipe-desc">${s.desc}</div>
    </div>
    <div class="pipe-tag ${s.done ? 'done' : 'pend'}">${s.done ? 'Complete' : 'Running_now'}</div>
  </div>`).join('');

const pObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.pipe-step').forEach(s => s.classList.add('visible'));
    }
  });
}, { threshold: .1 });
pObs.observe(pipeEl);

/* ──────────────────────────────────────────────
   16. Boot — initialise default states
─────────────────────────────────────────────── */
selectModel('attnresunet', document.querySelector('.mb.active'));
renderXAI();
renderLMCS();
renderSdem();
