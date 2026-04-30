// LOCKIQ IMPACT V2 — DATA FLOW VERSION

const API = '/.netlify/functions/getMarketData';

// ===== STATE =====
let marketData = null;

// ===== HELPERS =====
function fmtTicks(val) {
  if (val === null || val === undefined) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(1) + ' ticks';
}

function fmtBps(val) {
  if (val === null || val === undefined) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(1) + ' bps';
}

function fmtPts(val) {
  if (val === null || val === undefined) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(2) + ' pts';
}

// ===== MAIN FETCH =====
async function loadData() {
  try {
    const res = await fetch(API);
    const data = await res.json();

    console.log('LOCKIQ DATA:', data);

    marketData = data;

    if (!data.instruments) {
      console.warn('No instruments found');
      return;
    }

    renderAll(data);

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

// ===== RENDER ALL =====
function renderAll(data) {
  const inst = data.instruments;

  renderMBS(inst);
  renderTreasuries(inst);
  renderFutures(inst);
}

// ===== MBS STACK =====
function renderMBS(inst) {
  setValue('umbs50', fmtTicks(inst.umbs50?.delta));
  setValue('umbs55', fmtTicks(inst.umbs55?.delta));
  setValue('umbs60', fmtTicks(inst.umbs60?.delta));

  setValue('gnma50', fmtTicks(inst.gnma50?.delta));
  setValue('gnma55', fmtTicks(inst.gnma55?.delta));
  setValue('gnma60', fmtTicks(inst.gnma60?.delta));
}

// ===== TREASURIES =====
function renderTreasuries(inst) {
  setValue('us10y', fmtBps(inst.us10y?.delta));
  setValue('us30y', fmtBps(inst.us30y?.delta));
  setValue('mbb', fmtPts(inst.mbb?.delta));
}

// ===== FUTURES =====
function renderFutures(inst) {
  setValue('zn', fmtTicks(inst.zn?.delta));
  setValue('zb', fmtTicks(inst.zb?.delta));
  setValue('zf', fmtTicks(inst.zf?.delta));
  setValue('zt', fmtTicks(inst.zt?.delta));
}

// ===== DOM HELPER =====
function setValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val || '—';

  el.classList.remove('pos', 'neg');

  if (!val || val === '—') return;

  if (val.includes('+')) el.classList.add('pos');
  if (val.includes('-')) el.classList.add('neg');
}

// ===== INIT =====
loadData();
setInterval(loadData, 60000);
