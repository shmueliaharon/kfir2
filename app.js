
const VERSION = (new URLSearchParams(location.search).get('v') || '16');
const DATA_URL = 'itinerary.json?v=' + VERSION;

function el(id){ return document.getElementById(id); }
function show(x){ x.classList.remove('hidden'); }
function hide(x){ x.classList.add('hidden'); }

function mapsSearchUrl(q){
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q || '');
}

function parseRoute(){
  const h = (location.hash || '#/').replace(/^#/, '');
  // routes: / , /day/0
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name:'home' };
  if (parts[0] === 'day' && parts[1]) return { name:'day', idx: Number(parts[1]) };
  return { name:'home' };
}

async function loadData(){
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  return await res.json();
}

function dayLabel(day, idx){
  const d = day.date ? day.date : ('יום ' + (idx + 1));
  const c = day.country ? day.country : '';
  const loc = day.location ? day.location : '';
  return `${d} | ${c} | ${loc}`.replace(/\s+\|\s+$/,'').replace(/^\s+\|\s+/,'');
}

function renderHome(data){
  el('appTitle').textContent = data.title || 'מסלול הטיול שלי';
  el('appSub').textContent = 'בחר יום כדי לראות פירוט';
  hide(el('btnBack'));
  el('q').value = el('q').value || '';

  const q = (el('q').value || '').trim().toLowerCase();
  const list = el('daysList');

  const items = (data.days || []).map((day, idx) => ({ day, idx }))
    .filter(x => {
      if (!q) return true;
      const hay = [
        x.day.date, x.day.country, x.day.location, x.day.lodging,
        ...(x.day.transfers || []),
        ...((x.day.places || []).map(p => p.name))
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

  list.innerHTML = items.map(({day, idx}) => {
    const loc = day.location || 'לא צוין';
    const country = day.country || 'לא צוין';
    const date = day.date || ('יום ' + (idx + 1));
    const lodging = day.lodging || 'לא צוין';
    const count = (day.places || []).length;

    return `
      <div class="dayCard">
        <div class="dayCard__top">
          <div>
            <div class="dayCard__date">${date}</div>
            <div class="dayCard__loc">${loc}</div>
            <div class="dayCard__meta">מדינה: ${country}<br>לינה: ${lodging}</div>
          </div>
          <div class="badge">${count} מקומות</div>
        </div>
        <div class="dayCard__actions">
          <a class="pill pill--primary" href="#/day/${idx}">פתח יום</a>
          <a class="pill" href="${mapsSearchUrl(loc + ' ' + country)}" target="_blank" rel="noopener">מפות לעיר</a>
        </div>
      </div>
    `;
  }).join('');

  show(el('viewHome'));
  hide(el('viewDay'));
}

function renderDay(data, idx){
  const day = (data.days || [])[idx];
  if (!day){
    location.hash = '#/';
    return;
  }

  el('appTitle').textContent = data.title || 'מסלול הטיול שלי';
  el('appSub').textContent = dayLabel(day, idx);
  show(el('btnBack'));

  el('dayTitle').textContent = (day.location || 'יום טיול') + (day.date ? ' (' + day.date + ')' : '');
  el('daySub').textContent = (day.country ? ('מדינה: ' + day.country + ' | ') : '') + (day.places ? ('מקומות: ' + day.places.length) : '');
  el('dayLodging').textContent = day.lodging || 'לא צוין';

  el('btnMapsDay').href = mapsSearchUrl((day.location || '') + ' ' + (day.country || ''));

  const transfers = el('dayTransfers');
  const t = day.transfers || [];
  transfers.innerHTML = t.length ? t.map(x => `<li>${x}</li>`).join('') : '<li>לא צוינו מעברים</li>';

  const places = el('placesList');
  const ps = day.places || [];
  places.innerHTML = ps.map((p) => {
    const name = (p.name || '').toString();
    const type = (p.type || 'מקום').toString();
    const desc = (p.description || '').toString();
    const tips = (p.tips || '').toString();
    const website = (p.website || '').toString();

    return `
      <div class="placeCard">
        <div class="placeTop">
          <div>
            <div class="placeName">${name}</div>
            <div class="placeType">${type}</div>
          </div>
          <a class="smallLink" href="${website ? website : mapsSearchUrl(name)}" target="_blank" rel="noopener">פתח במפות</a>
        </div>
        ${desc ? `<div class="placeDesc">${desc}</div>` : ''}
        ${tips ? `<div class="placeTips"><b>טיפ:</b> ${tips}</div>` : ''}
        <div class="placeActions">
          <button class="smallBtn" data-copy="${name}">העתק שם</button>
        </div>
      </div>
    `;
  }).join('');

  places.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || '';
      try { await navigator.clipboard.writeText(text); } catch(e) {}
      btn.textContent = 'הועתק';
      setTimeout(() => btn.textContent = 'העתק שם', 900);
    });
  });

  hide(el('viewHome'));
  show(el('viewDay'));
}

async function main(){
  const data = await loadData();

  el('btnHome').addEventListener('click', (e) => {
    // keep as link
  });
  el('btnBack').addEventListener('click', () => { location.hash = '#/'; });
  el('btnClear').addEventListener('click', () => { el('q').value=''; renderHome(data); });

  el('q').addEventListener('input', () => {
    const r = parseRoute();
    if (r.name === 'home') renderHome(data);
  });

  function route(){
    const r = parseRoute();
    if (r.name === 'day' && Number.isFinite(r.idx) && r.idx >= 0){
      renderDay(data, r.idx);
    } else {
      renderHome(data);
    }
  }

  window.addEventListener('hashchange', route);
  route();
}

main();
