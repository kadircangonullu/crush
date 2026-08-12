const hero = document.querySelector('.hero');
const sleeve = document.getElementById('recordSleeve');
const platter = document.getElementById('platter');
const flight = document.getElementById('recordFlight');
const recordOnPlatter = document.getElementById('recordOnPlatter');
const deckButton = document.getElementById('deckButton');
const deckIcon = document.getElementById('deckIcon');
const playStatus = document.getElementById('playStatus');
const nowPlaying = document.getElementById('nowPlaying');
const youtubeAudio = document.getElementById('youtubeAudio');
const BASE_RECORD = 360;
let playing = false;
let animating = false;

function transformForRect(rect, fill = 0.9) {
  const targetSize = Math.min(rect.width, rect.height) * fill;
  const scale = targetSize / BASE_RECORD;
  const x = rect.left + (rect.width - targetSize) / 2;
  const y = rect.top + (rect.height - targetSize) / 2;
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

function setAudio(on) {
  youtubeAudio.src = on
    ? 'https://www.youtube.com/embed/aKGCXYX7jN8?autoplay=1&playsinline=1&rel=0'
    : 'about:blank';
}

function playRecord() {
  if (playing || animating) return;
  animating = true;
  const sleeveRect = sleeve.getBoundingClientRect();
  const platterRect = platter.getBoundingClientRect();

  hero.classList.remove('returning');
  recordOnPlatter.classList.remove('visible', 'spinning');
  flight.classList.remove('moving', 'spinning');
  flight.style.zIndex = '23'; // kılıfın arkasında başlar
  flight.style.opacity = '1';
  flight.style.transform = transformForRect(sleeveRect, 0.77);
  playStatus.textContent = 'PLACING VINYL';
  deckIcon.textContent = 'Ⅱ';
  setAudio(true);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    flight.classList.add('moving');
    // Kılıftan çıkmaya başladıktan sonra ön katmana alınır.
    window.setTimeout(() => { flight.style.zIndex = '26'; }, 180);
    flight.style.transform = transformForRect(platterRect, 0.93);
  }));

  window.setTimeout(() => {
    // Pikaba ulaştığında global uçan plak yerine pikabın içindeki plak gösterilir.
    flight.style.opacity = '0';
    flight.classList.remove('moving');
    recordOnPlatter.classList.add('visible', 'spinning');
    playing = true;
    animating = false;
    hero.classList.add('playing');
    nowPlaying.classList.add('playing');
    playStatus.textContent = 'NOW PLAYING';
  }, 1020);
}

function stopRecord() {
  if ((!playing && !animating) || hero.classList.contains('returning')) return;
  playing = false;
  animating = true;
  setAudio(false);
  hero.classList.remove('playing');
  hero.classList.add('returning');
  nowPlaying.classList.remove('playing');
  deckIcon.textContent = '▶';
  playStatus.textContent = 'RETURNING TO SLEEVE';

  const platterRect = platter.getBoundingClientRect();
  const sleeveRect = sleeve.getBoundingClientRect();

  // Pikaptaki yerleşik plağı uçan plağa dönüştür.
  recordOnPlatter.classList.remove('spinning', 'visible');
  flight.classList.remove('moving', 'spinning');
  flight.style.zIndex = '26';
  flight.style.opacity = '1';
  flight.style.transform = transformForRect(platterRect, 0.93);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    flight.classList.add('moving');
    flight.style.transform = transformForRect(sleeveRect, 0.77);
    // Kılıfa yaklaşırken plak önden arkaya alınır; böylece gerçekten içine giriyormuş gibi kaybolur.
    window.setTimeout(() => { flight.style.zIndex = '23'; }, 700);
  }));

  window.setTimeout(() => {
    flight.style.opacity = '0';
    flight.classList.remove('moving');
    hero.classList.remove('returning');
    playStatus.textContent = 'READY TO PLAY';
    animating = false;
  }, 1000);
}

function toggleRecord() {
  if (playing || hero.classList.contains('returning')) stopRecord();
  else playRecord();
}

sleeve.addEventListener('click', toggleRecord);
deckButton.addEventListener('click', toggleRecord);

window.addEventListener('resize', () => {});

const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(open));
});
mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  document.body.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

const modal = document.getElementById('videoModal');
const frame = document.getElementById('videoFrame');
const modalTitle = document.getElementById('modalTitle');

function openVideo(button) {
  const id = button.dataset.video;
  const title = button.dataset.title || 'CRUSH Video';
  if (playing) stopRecord();
  modalTitle.textContent = title;
  frame.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeVideo() {
  frame.src = 'about:blank';
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('.video-trigger').forEach(btn => btn.addEventListener('click', () => openVideo(btn)));
document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeVideo));
window.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeVideo(); });


// ===== NAVBAR SCROLLSPY =====
const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
const header = document.querySelector('.site-header');
const navTargets = navLinks
  .map(link => ({ link, target: document.querySelector(link.getAttribute('href')) }))
  .filter(item => item.target);

function updateActiveNav() {
  const marker = window.scrollY + (header?.offsetHeight || 0) + 120;
  const passed = navTargets
    .map(item => ({ ...item, top: item.target.getBoundingClientRect().top + window.scrollY }))
    .filter(item => item.top <= marker)
    .sort((a, b) => b.top - a.top);
  const current = passed[0] || navTargets[0];
  navLinks.forEach(link => link.classList.toggle('active', link === current?.link));
}
window.addEventListener('scroll', updateActiveNav, { passive: true });
window.addEventListener('resize', updateActiveNav);
navLinks.forEach(link => link.addEventListener('click', () => {
  navLinks.forEach(l => l.classList.toggle('active', l === link));
}));
updateActiveNav();

// ===== DYNAMIC CONTENT CALENDAR =====
const calendarCards = [...document.querySelectorAll('.calendar-card[data-date]')];
const focusDay = document.getElementById('focusDay');
const focusMonth = document.getElementById('focusMonth');
const focusStatus = document.getElementById('focusStatus');
const monthNames = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

function localDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function parseLocalISO(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y,m-1,d);
}
function diffDays(a,b) {
  return Math.round((localDay(a) - localDay(b)) / 86400000);
}
function calendarLabel(diff) {
  if (diff < 0) return 'YAYINLANDI';
  if (diff === 0) return 'BUGÜN';
  if (diff === 1) return 'YARIN';
  return diff <= 5 ? `${diff} GÜN SONRA` : 'YAKINDA';
}
function updateCalendar() {
  const today = localDay(new Date());
  let focus = null;
  let firstFuture = null;
  calendarCards.forEach(card => {
    const date = parseLocalISO(card.dataset.date);
    const diff = diffDays(date, today);
    const state = card.querySelector('.calendar-state');
    card.classList.remove('is-published','is-today','is-tomorrow','is-next','is-focus');
    state.textContent = calendarLabel(diff);
    if (diff < 0) card.classList.add('is-published');
    else if (diff === 0) { card.classList.add('is-today'); focus = {card,date,diff}; }
    else if (diff === 1) { card.classList.add('is-tomorrow'); if (!focus) focus = {card,date,diff}; }
    else if (!firstFuture) firstFuture = {card,date,diff};
  });
  if (!focus) focus = firstFuture;
  if (focus) {
    if (!focus.card.classList.contains('is-today') && !focus.card.classList.contains('is-tomorrow')) focus.card.classList.add('is-next');
    focus.card.classList.add('is-focus');
    focusDay.textContent = String(focus.date.getDate()).padStart(2,'0');
    focusMonth.textContent = monthNames[focus.date.getMonth()];
    focusStatus.textContent = calendarLabel(focus.diff);
  } else if (calendarCards.length) {
    const last = calendarCards[calendarCards.length - 1];
    const date = parseLocalISO(last.dataset.date);
    last.classList.add('is-focus');
    focusDay.textContent = String(date.getDate()).padStart(2,'0');
    focusMonth.textContent = monthNames[date.getMonth()];
    focusStatus.textContent = 'TAMAMLANDI';
  }
}
updateCalendar();
// Sayfa uzun süre açık kalırsa gece yarısından sonra da durum yenilensin.
setInterval(updateCalendar, 60 * 60 * 1000);
