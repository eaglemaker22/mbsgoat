const ENDPOINT = '/.netlify/functions/getMarketData';
const state = { data:null, tz:'America/New_York', anchor:'today_open' };

const TZ_LABELS = {
  'America/New_York':'ET','America/Chicago':'CT','America/Denver':'MT','America/Phoenix':'AZ','America/Los_Angeles':'PT'
};

const ANCHOR_LABELS = {
  yesterday_open:'Yesterday Open', yesterday_close:'Yesterday Close', today_open:'Today Open',
  '0700':'7:00 AM','0800':'8:00 AM','0900':'9:00 AM','1000':'10:00 AM','1100':'11:00 AM',
  '1200':'12:00 PM','1300':'1:00 PM','1400':'2:00 PM','1500':'3:00 PM','1600':'4:00 PM', today_close:'Today Close'
};

const $ = id => document.getElementById(id);
const num = v => Number.isFinite(parseFloat(v)) ? parseFloat(v) : null;
const signed = (v, decimals=1) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(decimals)}`;

function tickClock(){
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:state.tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
  $('clockEl').textContent = `${parts} ${TZ_LABELS[state.tz]}`;
}
setInterval(tickClock, 1000);

document.addEventListener('DOMContentLoaded', () => {
  $('timezoneSelect').addEventListener('change', e => { state.tz = e.target.value; tickClock(); render(); });
  $('anchorSelect').addEventListener('change', e => { state.anchor = e.target.value; render(); });
  tickClock(); fetchData(); setInterval(fetchData, 90000);
});

async function fetchData(){
  setStatus('loading','CONNECTING');
  try{
    const res = await fetch(ENDPOINT, { cache:'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    render();
  }catch(err){
    console.error(err);
    setStatus('stale','CONNECTION ERROR');
    $('marketSummary').textContent = 'Could not reach LockIQ market feed. Check Netlify function logs or Firebase credentials.';
  }
}

function setStatus(cls, text){
  const el = $('dataStatus');
  el.className = `status-pill ${cls}`;
  el.innerHTML = `<span></span>${text}`;
}

function formatTime(raw){
  if(!raw) return '—';
  const d = parseDateLoose(raw);
  if(!d) return String(raw);
  return new Intl.DateTimeFormat('en-US',{timeZone:state.tz,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d) + ` ${TZ_LABELS[state.tz]}`;
}

function parseDateLoose(raw){
  if(!raw) return null;
  if(raw instanceof Date) return raw;
  const s = String(raw);
  let d = new Date(s);
  if(!isNaN(d)) return d;
  d = new Date(s.replace(' ','T'));
  if(!isNaN(d)) return d;
  return null;
}

function getDataAgeMinutes(){
  const d = parseDateLoose(state.data?.last_updated);
  if(!d) return null;
  return Math.round((Date.now() - d.getTime()) / 60000);
}

function render(){
  const d = state.data;
  $('anchorLabel').textContent = ANCHOR_LABELS[state.anchor] || state.anchor;
  if(!d) return;

  const age = getDataAgeMinutes();
  if(age == null) setStatus('loading','LIVE FEED');
  else if(age <= 5) setStatus('live',`LIVE · ${age < 1 ? 'JUST NOW' : age + 'M AGO'}`);
  else if(age <= 15) setStatus('loading',`LAGGING · ${age}M AGO`);
  else setStatus('stale',`STALE · ${age}M AGO`);

  $('lastUpdated').textContent = formatTime(d.last_updated);
  $('mbsAsOf').textContent = d.scraper_status?.mbs_updated ? formatTime(d.scraper_status.mbs_updated) : 'MBS feed';
  $('bondAsOf').textContent = d.scraper_status?.bonds_updated ? formatTime(d.scraper_status.bonds_updated) : 'Bond feed';

  const market = buildMarketModel(d);
  renderHero(market);
  renderSignalCards(market);
  renderRows(market);
}

function buildMarketModel(d){
  // Current endpoint already provides open-based deltas for UMBS 5.0, 10Y, and ZN.
  // For chunk 1, unsupported anchors fall back to Today Open until hourly anchor snapshots are exposed by the backend.
  const anchorReady = state.anchor === 'today_open';
  const mbs50Delta = num(d.umbs50?.delta) ?? 0;
  const t10yDelta = num(d.t10y?.delta) ?? 0;
  const znDelta = num(d.zn?.delta) ?? 0;

  // Placeholder/future expansion: once getMarketData returns full instrument map by anchor, this model will read it here.
  const umbs55Delta = num(d.regression?.predicted_umbs55_delta) ?? mbs50Delta;
  const estimatedPricing = Math.round(umbs55Delta * 62.5); // 1 tick ≈ $62.50 per $100k as a conservative displayed estimate.

  const mbsBetter = umbs55Delta > 1.5;
  const mbsWorse = umbs55Delta < -1.5;
  const treasuryConfirmsBetter = t10yDelta < -1.5 && znDelta > 1.5;
  const treasuryConfirmsWorse = t10yDelta > 1.5 && znDelta < -1.5;
  const mixed = !treasuryConfirmsBetter && !treasuryConfirmsWorse;

  let bias = 'Watch Bias', biasClass = 'caution';
  if(mbsBetter && (treasuryConfirmsBetter || mixed)) { bias = 'Float Bias'; biasClass='float'; }
  if(mbsWorse && (treasuryConfirmsWorse || mixed)) { bias = 'Lock Bias'; biasClass='lock'; }

  let confirmation = 'Mixed';
  if((mbsBetter && treasuryConfirmsBetter) || (mbsWorse && treasuryConfirmsWorse)) confirmation = 'Strong';
  if((mbsBetter && treasuryConfirmsWorse) || (mbsWorse && treasuryConfirmsBetter)) confirmation = 'Weak';

  const absMove = Math.abs(umbs55Delta);
  let repriceRisk = 'Low';
  if(absMove >= 4 && absMove < 8) repriceRisk = 'Medium';
  if(absMove >= 8) repriceRisk = 'High';

  let pressure = 'Neutral';
  if(mbsBetter) pressure = 'Improving';
  if(mbsWorse) pressure = 'Worsening';

  let volatility = 'Low';
  if(absMove >= 4 || Math.abs(t10yDelta) >= 4) volatility = 'Moderate';
  if(absMove >= 8 || Math.abs(t10yDelta) >= 8) volatility = 'High';

  return { anchorReady, umbs55Delta, mbs50Delta, t10yDelta, znDelta, estimatedPricing, bias, biasClass, confirmation, repriceRisk, pressure, volatility, d };
}

function renderHero(m){
  const impact = $('impactValue');
  impact.textContent = money(m.estimatedPricing);
  impact.className = 'impact-value ' + (m.estimatedPricing > 0 ? 'positive' : m.estimatedPricing < 0 ? 'negative' : 'neutral');

  const badge = $('signalBadge');
  badge.textContent = m.bias;
  badge.className = `signal-badge ${m.biasClass}`;

  $('primaryDriver').textContent = 'UMBS 5.5 / model blend';
  const anchorWarning = m.anchorReady ? '' : ' This anchor is UI-ready, but backend hourly anchor snapshots still need to be added, so chunk 1 is temporarily using Today Open deltas.';
  $('marketSummary').textContent = `Since ${ANCHOR_LABELS[state.anchor]}, MBS are ${m.umbs55Delta >= 0 ? 'better' : 'worse'} by ${Math.abs(m.umbs55Delta).toFixed(1)} ticks. 10Y is ${signed(m.t10yDelta,1)} bps and ZN is ${signed(m.znDelta,1)} ticks. Confirmation is ${m.confirmation.toLowerCase()}.${anchorWarning}`;
}

function renderSignalCards(m){
  setCard('repriceCard','repriceRisk','repriceNote',m.repriceRisk, m.repriceRisk === 'High' ? 'bad' : m.repriceRisk === 'Medium' ? 'warn' : 'good', 'Magnitude of MBS move from selected anchor.');
  setCard('pressureCard','marketPressure','pressureNote',m.pressure, m.pressure === 'Improving' ? 'good' : m.pressure === 'Worsening' ? 'bad' : 'warn', 'Primary read from MBS direction.');
  setCard('confirmCard','confirmation','confirmNote',m.confirmation, m.confirmation === 'Strong' ? 'good' : m.confirmation === 'Weak' ? 'bad' : 'warn', 'Treasury and futures alignment.');
  setCard('volCard','volatility','volNote',m.volatility, m.volatility === 'High' ? 'bad' : m.volatility === 'Moderate' ? 'warn' : 'good', 'Larger moves mean more reprice sensitivity.');
}

function setCard(cardId,valueId,noteId,value,cls,note){
  $(cardId).className = `signal-card ${cls}`;
  $(valueId).textContent = value;
  $(noteId).textContent = note;
}

function renderRows(m){
  const d = m.d;
  renderDataRows('mbsRows', [
    row('UMBS 5.0', d.umbs50?.currentFmt, m.mbs50Delta, 'ticks', false),
    row('UMBS 5.5', 'model', m.umbs55Delta, 'ticks', false, 'Using predicted UMBS 5.5 until the endpoint exposes current/open fields.'),
    row('UMBS 6.0', 'pending', null, 'ticks'),
    row('GNMA 5.0', 'pending', null, 'ticks'),
    row('GNMA 5.5', 'pending', null, 'ticks'),
    row('GNMA 6.0', 'pending', null, 'ticks'),
  ]);

  renderDataRows('treasuryRows', [
    row('US10Y', m.d.t10y?.current ? m.d.t10y.current.toFixed(3)+'%' : '—', m.t10yDelta, 'bps', true),
    row('US30Y', 'pending', null, 'bps', true),
    row('MBB', 'pending', num(d.regression?.delta_mbb), 'pts', false),
  ]);

  renderDataRows('futureRows', [
    row('ZN', d.zn?.currentFmt, m.znDelta, 'ticks', false),
    row('ZB', 'pending', null, 'ticks'),
    row('ZF', 'pending', null, 'ticks'),
    row('ZT', 'pending', null, 'ticks'),
  ]);
}

function row(name,current,delta,unit,inverted=false,note='') { return {name,current,delta,unit,inverted,note}; }

function renderDataRows(containerId, rows){
  $(containerId).innerHTML = rows.map(r => {
    const cls = deltaClass(r.delta, r.inverted);
    const deltaText = r.delta == null ? '—' : `${signed(r.delta,1)} ${r.unit}`;
    return `<div class="data-row">
      <div class="row-name">${r.name}</div>
      <div class="row-current">${r.current ?? '—'}</div>
      <div class="row-delta ${cls}">${deltaText}</div>
      ${r.note ? `<div class="row-note">${r.note}</div>` : ''}
    </div>`;
  }).join('');
}

function deltaClass(delta, inverted=false){
  if(delta == null || Math.abs(delta) < .05) return 'neu';
  const good = inverted ? delta < 0 : delta > 0;
  return good ? 'good' : 'bad';
}

function money(v){
  if(v == null) return '—';
  const sign = v > 0 ? '+$' : v < 0 ? '-$' : '$';
  return sign + Math.abs(Math.round(v)).toLocaleString();
}
