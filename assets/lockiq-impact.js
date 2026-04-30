// LOCKIQ IMPACT V2 — FIXED RENDER VERSION

const API = '/.netlify/functions/getMarketData';

// ===== HELPERS =====
function fmt(val, type) {
  if (val === null || val === undefined) return '—';

  if (type === 'ticks') return (val >= 0 ? '+' : '') + val.toFixed(1) + ' ticks';
  if (type === 'bps') return (val >= 0 ? '+' : '') + val.toFixed(1) + ' bps';
  if (type === 'pts') return (val >= 0 ? '+' : '') + val.toFixed(2) + ' pts';

  return val;
}

function row(name, val, type) {
  let cls = 'row-delta neu';
  if (val > 0) cls = 'row-delta good';
  if (val < 0) cls = 'row-delta bad';

  return `
    <div class="data-row">
      <div class="row-name">${name}</div>
      <div class="row-delta ${cls}">${fmt(val, type)}</div>
    </div>
  `;
}

// ===== MAIN =====
async function loadData() {
  try {
    const res = await fetch(API);
    const data = await res.json();

    console.log('DATA:', data);

    if (!data.instruments) {
      console.warn('No instruments found');
      return;
    }

    render(data.instruments);

  } catch (err) {
    console.error(err);
  }
}

// ===== RENDER =====
function render(inst) {

  // ===== MBS =====
  document.getElementById('mbsRows').innerHTML = `
    ${row('UMBS 5.0', inst.umbs50?.delta, 'ticks')}
    ${row('UMBS 5.5', inst.umbs55?.delta, 'ticks')}
    ${row('UMBS 6.0', inst.umbs60?.delta, 'ticks')}
    ${row('GNMA 5.0', inst.gnma50?.delta, 'ticks')}
    ${row('GNMA 5.5', inst.gnma55?.delta, 'ticks')}
    ${row('GNMA 6.0', inst.gnma60?.delta, 'ticks')}
  `;

  // ===== TREASURIES =====
  document.getElementById('treasuryRows').innerHTML = `
    ${row('US10Y', inst.us10y?.delta, 'bps')}
    ${row('US30Y', inst.us30y?.delta, 'bps')}
    ${row('MBB', inst.mbb?.delta, 'pts')}
  `;

  // ===== FUTURES =====
  document.getElementById('futureRows').innerHTML = `
    ${row('ZN', inst.zn?.delta, 'ticks')}
    ${row('ZB', inst.zb?.delta, 'ticks')}
    ${row('ZF', inst.zf?.delta, 'ticks')}
    ${row('ZT', inst.zt?.delta, 'ticks')}
  `;
}

// ===== INIT =====
loadData();
setInterval(loadData, 60000);
