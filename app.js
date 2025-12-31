
const VERSION = '18.2';
const DATA_URL = 'itinerary.json?v=' + VERSION;
const COUNTRY_KEY = 'selected_country_v18_1';

function el(id){ return document.getElementById(id); }
function show(x){ x.classList.remove('hidden'); }

function showFatal(title, details){
  const root = document.getElementById('app');
  if (!root) return;
  root.innerHTML = `
    <div style="max-width:900px;margin:24px auto;padding:16px;background:rgba(255,255,255,0.92);border:1px solid rgba(15,23,42,0.14);border-radius:16px">
      <div style="font-weight:900;font-size:18px;margin-bottom:8px">⚠️ ${title}</div>
      <div style="white-space:pre-wrap;color:rgba(15,23,42,0.80);font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;font-size:12px;line-height:1.4">${details || ''}</div>
      <div style="margin-top:10px;color:rgba(15,23,42,0.70);font-size:13px">טיפ: נסה לפתוח את האתר עם ?v=182 ולרענן.</div>
    </div>
  `;
}
function hide(x){ x.classList.add('hidden'); }

function mapsSearchUrl(q){
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q || '');
}

function parseRoute(){
  const h = (location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name:'home' };
  if (parts[0] === 'day' && parts[1]) return { name:'day', idx: Number(parts[1]) };
  return { name:'home' };
}

async function loadData(){
  try{
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  return await res.json();
  }catch(err){
    throw new Error('שגיאה בקריאת הנתונים (itinerary.json): ' + (err && (err.message||err)));
  }

}


function getSelectedCountry(){
  try { return localStorage.getItem(COUNTRY_KEY) || 'הכל'; } catch(e){ return 'הכל'; }
}
function setSelectedCountry(v){
  try { localStorage.setItem(COUNTRY_KEY, v); } catch(e){}
}
function dayLabel(day, idx){
  const d = day.date ? day.date : ('יום ' + (idx + 1));
  const c = day.country ? day.country : '';
  const loc = day.location ? day.location : '';
  return `${d} | ${c} | ${loc}`.replace(/\s+\|\s+$/,'').replace(/^\s+\|\s+/,'');
}

function renderHome(data){
  el('appTitle').textContent = data.title || 'מסלול הטיול שלי';
  el('appSub').textContent = (selectedCountry === 'הכל') ? 'בחר יום כדי לראות פירוט' : ('מדינה נבחרת: ' + selectedCountry);
  hide(el('btnBack'));

  const q = (el('q').value || '').trim().toLowerCase();
  const countryBar = el('countryBar');
  const selectedCountry = getSelectedCountry();
  const countries = Array.from(new Set((data.days || [])
    .map(d => (d.country || '').toString().trim())
    .filter(Boolean)));
  countries.sort((a,b)=>a.localeCompare(b,'he'));
  const allOptions = ['הכל', ...countries];

  if (countryBar){
    countryBar.innerHTML = allOptions.map(c => {
      const cls = 'countryChip' + (c === selectedCountry ? ' isActive' : '');
      return `<button type="button" class="${cls}" data-country="${c}">${c}</button>`;
    }).join('');
    countryBar.querySelectorAll('[data-country]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.getAttribute('data-country') || 'הכל';
        setSelectedCountry(c);
        renderHome(data);
        window.scrollTo({top:0, behavior:'smooth'});
      });
    });
  }


  const list = el('daysList');

  const items = (data.days || []).map((day, idx) => ({ day, idx }))
    .filter(x => {
      const countryOk = (selectedCountry === 'הכל') || (((x.day.country || '').toString().trim()) === selectedCountry);
      if (!countryOk) return false;
      if (!q) return true;
      const hay = [
        x.day.date, x.day.country, x.day.location, x.day.lodging,
        ...(x.day.transfers || []),
        ...((x.day.places || []).map(p => p.name)),
        ...((x.day.suggestions || []).map(p => p.name))
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

  list.innerHTML = items.map(({day, idx}) => {
    const loc = day.location || 'לא צוין';
    const country = day.country || 'לא צוין';
    const date = day.date || ('יום ' + (idx + 1));
    const lodging = day.lodging || 'לא צוין';
    const count = (day.places || []).length;
    const sugCount = (day.suggestions || []).length;

    return `
      <div class="dayCard">
        <div class="dayCard__top">
          <div>
            <div class="dayCard__date">${date}</div>
            <div class="dayCard__loc">${loc}</div>
            <div class="dayCard__meta">מדינה: ${country}<br>לינה: ${lodging}</div>
          </div>
          <div class="badge">${count ? (count + ' מקומות') : (sugCount ? (sugCount + ' הצעות') : 'יום')}</div>
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

function placeCard(p, fallbackQuery){
  const name = (p.name || '').toString();
  const type = (p.type || 'מקום').toString();
  const desc = (p.description || '').toString();
  const tips = (p.tips || '').toString();
  const website = (p.website || '').toString();
  const url = website ? website : mapsSearchUrl(fallbackQuery || name);

  return `
    <div class="placeCard">
      <div class="placeTop">
        <div>
          <div class="placeName">${name}</div>
          <div class="placeType">${type}</div>
        </div>
        <a class="smallLink" href="${url}" target="_blank" rel="noopener">פתח במפות</a>
      </div>
      ${desc ? `<div class="placeDesc">${desc}</div>` : ''}
      ${tips ? `<div class="placeTips"><b>טיפ:</b> ${tips}</div>` : ''}
      <div class="placeActions">
        <button class="smallBtn" data-copy="${name}">העתק שם</button>
      </div>
    </div>
  `;
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
  el('daySub').textContent = (day.country ? ('מדינה: ' + day.country + ' | ') : '') + ((day.places && day.places.length) ? ('מקומות: ' + day.places.length) : ((day.suggestions && day.suggestions.length) ? ('הצעות: ' + day.suggestions.length) : ''));
  el('dayLodging').textContent = day.lodging || 'לא צוין';

  el('daySummary').textContent = day.summary || '';

  el('btnMapsDay').href = mapsSearchUrl((day.location || '') + ' ' + (day.country || ''));

  const transfers = el('dayTransfers');
  const t = day.transfers || [];
  transfers.innerHTML = t.length ? t.map(x => `<li>${x}</li>`).join('') : '<li>לא צוינו מעברים</li>';

  const restCard = el('restaurantsCard');
  const restList = el('dayRestaurants');
  const r = day.restaurants || [];
  if (r.length){
    restList.innerHTML = r.map(x => `<li>${x}</li>`).join('');
    restCard.style.display = '';
  } else {
    restList.innerHTML = '';
    restCard.style.display = 'none';
  }

  const places = el('placesList');
  const ps = day.places || [];
  places.innerHTML = ps.map(p => placeCard(p, (day.location || '') + ' ' + (day.country || ''))).join('');

  const suggestTitle = el('suggestTitle');
  const suggestList = el('suggestList');
  const sug = day.suggestions || [];
  if (!ps.length && sug.length){
    show(suggestTitle);
    show(suggestList);
    suggestList.innerHTML = sug.map(p => placeCard(p, (day.location || '') + ' ' + (day.country || ''))).join('');
  } else {
    hide(suggestTitle);
    hide(suggestList);
    suggestList.innerHTML = '';
  }

  // copy handlers
  document.querySelectorAll('[data-copy]').forEach(btn => {
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
