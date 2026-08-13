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

// ===== FULL MEMBER CAROUSEL =====
const membersCarousel = document.getElementById('membersCarousel');
const memberViewport = document.getElementById('memberViewport');
const memberTrack = document.getElementById('memberTrack');
const memberSlides = memberTrack ? [...memberTrack.querySelectorAll('.member-slide')] : [];
const memberPrevFull = document.getElementById('memberPrevFull');
const memberNextFull = document.getElementById('memberNextFull');
const memberDotsFull = document.getElementById('memberDotsFull');
const memberCurrentFull = document.getElementById('memberCurrentFull');
let fullMemberIndex = 0;
let memberPointerId = null;
let memberStartX = 0;
let memberStartY = 0;
let memberDeltaX = 0;
let memberDragging = false;
let memberSuppressClick = false;

function memberClampIndex(index) {
  if (!memberSlides.length) return 0;
  return (index + memberSlides.length) % memberSlides.length;
}

function memberStackOffset(index, active) {
  let offset = index - active;
  const total = memberSlides.length;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function renderFullMember(index, animate = true) {
  if (!memberTrack || !memberSlides.length) return;
  fullMemberIndex = memberClampIndex(index);
  memberViewport?.style.setProperty('--deck-drag','0px');

  const prevIndex = memberClampIndex(fullMemberIndex - 1);
  const nextIndex = memberClampIndex(fullMemberIndex + 1);

  memberSlides.forEach((slide, i) => {
    const active = i === fullMemberIndex;
    const prev = i === prevIndex;
    const next = i === nextIndex;

    slide.classList.toggle('is-active', active);
    slide.classList.toggle('is-prev', prev);
    slide.classList.toggle('is-next', next);
    slide.classList.toggle('is-hidden', !active && !prev && !next);
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    slide.style.zIndex = active ? '5' : (prev || next ? '3' : '1');
  });

  if (memberCurrentFull) memberCurrentFull.textContent = String(fullMemberIndex + 1).padStart(2, '0');
  [...(memberDotsFull?.children || [])].forEach((dot, i) => {
    dot.classList.toggle('active', i === fullMemberIndex);
    dot.setAttribute('aria-current', i === fullMemberIndex ? 'true' : 'false');
  });

  const railName = document.getElementById('memberRailName');
  const railProgress = document.getElementById('memberRailProgress');
  if (railName) railName.textContent = String(memberSlides[fullMemberIndex]?.dataset.member || '').toLocaleUpperCase('tr-TR');
  if (railProgress) railProgress.style.width = `${((fullMemberIndex + 1) / memberSlides.length) * 100}%`;
}

if (memberDotsFull && memberSlides.length) {
  memberSlides.forEach((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `${slide.dataset.member || `Üye ${i + 1}`} kartını göster`);
    dot.addEventListener('click', () => renderFullMember(i));
    memberDotsFull.appendChild(dot);
  });
}

memberPrevFull?.addEventListener('click', () => renderFullMember(fullMemberIndex - 1));
memberNextFull?.addEventListener('click', () => renderFullMember(fullMemberIndex + 1));

memberViewport?.addEventListener('keydown', event => {
  if (event.target.closest('a,button,input,textarea,select')) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    renderFullMember(fullMemberIndex - 1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    renderFullMember(fullMemberIndex + 1);
  }
});

memberViewport?.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('a,button')) return;
  memberPointerId = event.pointerId;
  memberStartX = event.clientX;
  memberStartY = event.clientY;
  memberDeltaX = 0;
  memberDragging = true;
  memberSuppressClick = false;
  memberViewport.setPointerCapture?.(event.pointerId);
  memberTrack?.classList.add('is-dragging');
});

memberViewport?.addEventListener('pointermove', event => {
  if (!memberDragging || event.pointerId !== memberPointerId || !memberTrack) return;
  const dx = event.clientX - memberStartX;
  const dy = event.clientY - memberStartY;
  memberDeltaX = dx;

  // Dikey kaydırma niyeti varsa carousel yatay hareketi ele geçirmez.
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) return;
  if (Math.abs(dx) > 7) memberSuppressClick = true;

  // Geçiş yalnızca pointer bırakıldığında yapılır; sürüklerken kartları sürekli
  // yeniden transform etmek yerine hafif bir cursor state kullanmak daha akıcıdır.
  memberViewport.classList.toggle('is-swipe-left', dx < -18);
  memberViewport.classList.toggle('is-swipe-right', dx > 18);
});

function finishMemberSwipe(event) {
  if (!memberDragging || (event && event.pointerId !== memberPointerId)) return;
  const dx = memberDeltaX;
  const threshold = Math.min(90, Math.max(48, (memberViewport?.clientWidth || 400) * .12));
  memberDragging = false;
  memberPointerId = null;
  memberTrack?.classList.remove('is-dragging');
  memberViewport?.style.setProperty('--deck-drag','0px');
  memberViewport?.classList.remove('is-swipe-left','is-swipe-right');

  if (Math.abs(dx) >= threshold) renderFullMember(fullMemberIndex + (dx < 0 ? 1 : -1));
  else renderFullMember(fullMemberIndex);

  window.setTimeout(() => { memberSuppressClick = false; }, 80);
}

memberViewport?.addEventListener('pointerup', finishMemberSwipe);
memberViewport?.addEventListener('pointercancel', finishMemberSwipe);
memberViewport?.addEventListener('lostpointercapture', event => {
  if (memberDragging) finishMemberSwipe(event);
});

// Swipe sonrası yanlışlıkla sosyal bağlantıya tıklanmasını engeller.
memberViewport?.addEventListener('click', event => {
  if (memberSuppressClick) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

renderFullMember(0, false);
window.addEventListener('resize', () => renderFullMember(fullMemberIndex, false));
requestAnimationFrame(() => memberTrack?.classList.remove('is-dragging'));

// Story alanı ekrana geldiğinde hafif giriş animasyonu.
const storyReveal = document.querySelector('.reveal-story');
if (storyReveal && 'IntersectionObserver' in window) {
  const storyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('story-visible');
        storyObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .2 });
  storyObserver.observe(storyReveal);
}

// ===== FIX 5 · 3D VIDEO ARCHIVE CAROUSEL =====
const videoCarousel = document.getElementById('videoCarousel');
const archiveCards = [...document.querySelectorAll('.archive-video-card')];
const archivePrev = document.getElementById('videoArchivePrev');
const archiveNext = document.getElementById('videoArchiveNext');
const archiveDots = document.getElementById('videoArchiveDots');
const archiveCurrent = document.getElementById('archiveCurrent');
const archiveTotal = document.getElementById('archiveTotal');
let archiveIndex = 0;
let archivePointerId = null;
let archiveStartX = 0;
let archiveStartY = 0;
let archiveDragging = false;
let archiveMoved = false;

if (archiveTotal) archiveTotal.textContent = String(archiveCards.length).padStart(2,'0');

function archiveOffset(index, active){
  let offset = index - active;
  const total = archiveCards.length;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function renderArchive(index){
  if (!archiveCards.length) return;
  archiveIndex = (index + archiveCards.length) % archiveCards.length;
  const compact = window.innerWidth < 680;
  archiveCards.forEach((card,i)=>{
    const off = archiveOffset(i, archiveIndex);
    const abs = Math.abs(off);
    const step = compact ? 105 : 245;
    const x = off * step;
    const z = abs === 0 ? 120 : 10 - abs * 70;
    const r = off * (compact ? -22 : -28);
    const scale = abs === 0 ? 1 : Math.max(.66,.88 - abs*.08);
    const opacity = abs > 2 ? 0 : Math.max(.3,1-abs*.2);
    card.style.setProperty('--card-x', `${x}px`);
    card.style.setProperty('--card-z', `${z}px`);
    card.style.setProperty('--card-r', `${r}deg`);
    card.style.setProperty('--card-scale', scale);
    card.style.setProperty('--card-opacity', opacity);
    card.style.zIndex = String(20-abs);
    card.classList.toggle('is-active', i===archiveIndex);
    card.setAttribute('aria-hidden', i===archiveIndex ? 'false':'true');
  });
  if (archiveCurrent) archiveCurrent.textContent = String(archiveIndex+1).padStart(2,'0');
  [...(archiveDots?.children||[])].forEach((dot,i)=>dot.classList.toggle('active',i===archiveIndex));
}

if (archiveDots && archiveCards.length){
  archiveCards.forEach((card,i)=>{
    const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',`${i+1}. videoyu seç`);dot.addEventListener('click',()=>renderArchive(i));archiveDots.appendChild(dot);
    card.addEventListener('click',event=>{
      if (archiveMoved){event.preventDefault();event.stopPropagation();return;}
      if (i !== archiveIndex){event.preventDefault();event.stopPropagation();renderArchive(i);}
    },true);
  });
}
archivePrev?.addEventListener('click',()=>renderArchive(archiveIndex-1));
archiveNext?.addEventListener('click',()=>renderArchive(archiveIndex+1));
videoCarousel?.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();renderArchive(archiveIndex-1)}if(event.key==='ArrowRight'){event.preventDefault();renderArchive(archiveIndex+1)}});
videoCarousel?.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('.video-carousel-arrow'))return;archivePointerId=event.pointerId;archiveStartX=event.clientX;archiveStartY=event.clientY;archiveDragging=true;archiveMoved=false;videoCarousel.setPointerCapture?.(event.pointerId)});
videoCarousel?.addEventListener('pointermove',event=>{if(!archiveDragging||event.pointerId!==archivePointerId)return;const dx=event.clientX-archiveStartX;const dy=event.clientY-archiveStartY;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12)return;if(Math.abs(dx)>10)archiveMoved=true});
function finishArchiveSwipe(event){if(!archiveDragging||(event&&event.pointerId!==archivePointerId))return;const dx=event.clientX-archiveStartX;archiveDragging=false;archivePointerId=null;if(Math.abs(dx)>55)renderArchive(archiveIndex+(dx<0?1:-1));window.setTimeout(()=>{archiveMoved=false},120)}
videoCarousel?.addEventListener('pointerup',finishArchiveSwipe);videoCarousel?.addEventListener('pointercancel',finishArchiveSwipe);window.addEventListener('resize',()=>renderArchive(archiveIndex));
renderArchive(0);


// ===== FIX 7 · CRUSH LETTER STUDIO =====
const letterStudio = document.getElementById('letterStudio');
const letterEnvelope = document.getElementById('letterEnvelope');
const letterDesk = document.getElementById('letterDesk');
const letterPaper = document.getElementById('letterPaper');
const letterEditor = document.getElementById('letterEditor');
const letterCanvas = document.getElementById('letterCanvas');
const letterInk = document.getElementById('letterInk');
const letterTools = [...document.querySelectorAll('[data-letter-mode]')];
const letterModeStatus = document.getElementById('letterModeStatus');
const clearLetterDrawing = document.getElementById('clearLetterDrawing');
const openSenderForm = document.getElementById('openSenderForm');
const senderForm = document.getElementById('senderForm');
const closeSenderForm = document.getElementById('closeSenderForm');
const letterSubmitNote = document.getElementById('letterSubmitNote');
const letterThemeOptions = [...document.querySelectorAll('[data-letter-theme]')];
const letterThemeName = document.getElementById('letterThemeName');
const letterThemeField = document.getElementById('letterThemeField');
const magicPenCursor = document.getElementById('magicPenCursor');
const penSparkleLayer = document.getElementById('penSparkleLayer');
let selectedLetterTheme = '1';

function setLetterTheme(theme, name) {
  selectedLetterTheme = String(theme || '1');
  letterPaper?.setAttribute('data-theme', selectedLetterTheme);
  letterThemeOptions.forEach(btn => {
    const active = btn.dataset.letterTheme === selectedLetterTheme;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  if (letterThemeName) letterThemeName.textContent = name || letterThemeOptions.find(btn => btn.dataset.letterTheme === selectedLetterTheme)?.dataset.themeName || 'LETTER STYLE';
  if (letterThemeField) letterThemeField.value = selectedLetterTheme;
}
letterThemeOptions.forEach(btn => btn.addEventListener('click', () => setLetterTheme(btn.dataset.letterTheme, btn.dataset.themeName)));
setLetterTheme('1','BLUE DOODLE');

let letterMode = 'write';
let drawing = false;
let lastPoint = null;
let canvasCtx = letterCanvas?.getContext('2d');

function openLetterStudio(){
  if (!letterStudio || letterStudio.classList.contains('is-open')) return;
  letterStudio.classList.add('is-open');
  letterEnvelope?.setAttribute('aria-expanded','true');
  letterDesk?.setAttribute('aria-hidden','false');
  window.setTimeout(() => {
    resizeLetterCanvas(true);
    letterEditor?.focus();
  }, 1150);
}
letterEnvelope?.addEventListener('click', openLetterStudio);

function setLetterMode(mode){
  letterMode = mode;
  letterTools.forEach(btn => btn.classList.toggle('active', btn.dataset.letterMode === mode));
  letterPaper?.classList.remove('write-mode','draw-mode','erase-mode');
  letterPaper?.classList.add(`${mode}-mode`);
  if (letterModeStatus) letterModeStatus.textContent = mode === 'write' ? 'Yazı modu aktif' : mode === 'draw' ? 'Süslü kalem modu aktif ✦' : 'Silgi modu aktif';
  if (mode !== 'draw') hideMagicPen();
  if (mode === 'write') letterEditor?.focus();
}
letterTools.forEach(btn => btn.addEventListener('click', () => setLetterMode(btn.dataset.letterMode)));
setLetterMode('write');

function resizeLetterCanvas(preserve = true){
  if (!letterCanvas || !letterPaper || !canvasCtx) return;
  const rect = letterPaper.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let snapshot = null;
  if (preserve && letterCanvas.width && letterCanvas.height) {
    snapshot = document.createElement('canvas');
    snapshot.width = letterCanvas.width;
    snapshot.height = letterCanvas.height;
    snapshot.getContext('2d').drawImage(letterCanvas,0,0);
  }
  letterCanvas.width = Math.round(rect.width * dpr);
  letterCanvas.height = Math.round(rect.height * dpr);
  letterCanvas.style.width = `${rect.width}px`;
  letterCanvas.style.height = `${rect.height}px`;
  canvasCtx = letterCanvas.getContext('2d');
  canvasCtx.setTransform(dpr,0,0,dpr,0,0);
  canvasCtx.lineCap = 'round';
  canvasCtx.lineJoin = 'round';
  if (snapshot) canvasCtx.drawImage(snapshot,0,0,snapshot.width,snapshot.height,0,0,rect.width,rect.height);
}
window.addEventListener('resize', () => resizeLetterCanvas(true));

function canvasPoint(event){
  const rect = letterCanvas.getBoundingClientRect();
  return {x:event.clientX-rect.left,y:event.clientY-rect.top};
}

let lastSparkAt = 0;
function syncMagicPenColor(){
  if (magicPenCursor) magicPenCursor.style.setProperty('--pen-color', letterInk?.value || '#ff2f92');
}
function positionMagicPen(event){
  if (!magicPenCursor || !letterPaper || letterMode !== 'draw') return;
  const paperRect = letterPaper.getBoundingClientRect();
  magicPenCursor.style.left = `${event.clientX - paperRect.left}px`;
  magicPenCursor.style.top = `${event.clientY - paperRect.top}px`;
  magicPenCursor.classList.add('is-visible');
}
function hideMagicPen(){ magicPenCursor?.classList.remove('is-visible','is-drawing'); }
function createPenSparkle(point){
  if (!penSparkleLayer || letterMode !== 'draw') return;
  const now = performance.now();
  if (now - lastSparkAt < 42) return;
  lastSparkAt = now;
  const spark = document.createElement('i');
  spark.className = `pen-sparkle${Math.random() > .72 ? ' dot' : ''}`;
  spark.style.left = `${point.x + (Math.random()*8-4)}px`;
  spark.style.top = `${point.y + (Math.random()*8-4)}px`;
  spark.style.setProperty('--spark-color', letterInk?.value || '#ff2f92');
  spark.style.setProperty('--sx', `${Math.round(Math.random()*22-11)}px`);
  spark.style.setProperty('--sy', `${Math.round(-8-Math.random()*17)}px`);
  penSparkleLayer.appendChild(spark);
  spark.addEventListener('animationend', () => spark.remove(), {once:true});
}
letterInk?.addEventListener('input', syncMagicPenColor);
syncMagicPenColor();
letterCanvas?.addEventListener('pointerenter', event => positionMagicPen(event));
letterCanvas?.addEventListener('pointerleave', hideMagicPen);
letterCanvas?.addEventListener('pointerdown', event => {
  if (letterMode === 'write') return;
  positionMagicPen(event);
  drawing = true;
  lastPoint = canvasPoint(event);
  if (letterMode === 'draw') magicPenCursor?.classList.add('is-drawing');
  letterCanvas.setPointerCapture?.(event.pointerId);
});
letterCanvas?.addEventListener('pointermove', event => {
  positionMagicPen(event);
  if (!drawing || !canvasCtx || letterMode === 'write') return;
  const point = canvasPoint(event);
  canvasCtx.save();
  canvasCtx.globalCompositeOperation = letterMode === 'erase' ? 'destination-out' : 'source-over';
  canvasCtx.strokeStyle = letterInk?.value || '#ff2f92';
  canvasCtx.lineWidth = letterMode === 'erase' ? 24 : 4;
  canvasCtx.beginPath();
  canvasCtx.moveTo(lastPoint.x,lastPoint.y);
  canvasCtx.lineTo(point.x,point.y);
  canvasCtx.stroke();
  canvasCtx.restore();
  if (letterMode === 'draw') createPenSparkle(point);
  lastPoint = point;
});
function stopLetterDraw(){
  drawing = false;
  lastPoint = null;
  magicPenCursor?.classList.remove('is-drawing');
}
letterCanvas?.addEventListener('pointerup', stopLetterDraw);
letterCanvas?.addEventListener('pointercancel', stopLetterDraw);
clearLetterDrawing?.addEventListener('click', () => {
  if (!canvasCtx || !letterCanvas) return;
  const rect = letterCanvas.getBoundingClientRect();
  canvasCtx.clearRect(0,0,rect.width,rect.height);
});

openSenderForm?.addEventListener('click', () => {
  if (!senderForm) return;
  senderForm.hidden = false;
  senderForm.scrollIntoView({behavior:'smooth',block:'nearest'});
});
closeSenderForm?.addEventListener('click', () => {
  if (senderForm) senderForm.hidden = true;
});
senderForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!senderForm.reportValidity()) return;
  if (letterSubmitNote) {
    letterSubmitNote.textContent = `Mektup gönderime hazır ✓ Kâğıt stili ${selectedLetterTheme}; metin, çizim ve gönderici bilgileriyle birlikte veritabanına bağlanmaya hazır.`;
  }
});
