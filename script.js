(async function bootCrushSite() {
const cmsDb = window.crushSupabase;
const cmsReady = window.CRUSH_DB_READY;

const cmsEsc = (value = "") =>
  String(value).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[c]);

function cmsUrl(value, fallback = "") {
  const v = String(value || "").trim();
  return v || fallback;
}

function memberSocialLink(url, label, icon) {
  if (!url) return "";
  return `<a aria-label="${cmsEsc(label)}" href="${cmsEsc(url)}" rel="noopener noreferrer" target="_blank"><span>${icon}</span></a>`;
}

function renderCmsMembers(members) {
  if (!members?.length) return;

  const preview = document.querySelector("#uyeler-preview .member-row");
  if (preview) {
    preview.innerHTML = members.map((m) => `
      <div class="member" style="--member: ${cmsEsc(m.accent_color || "#ff7398")}">
        <div class="member-photo">
          <img alt="${cmsEsc(m.display_name)}" decoding="async" loading="lazy"
               src="${cmsEsc(cmsUrl(m.thumbnail_url, m.photo_url))}" />
          <span hidden>${cmsEsc((m.first_name || m.display_name || "?").slice(0,1))}</span>
        </div>
        <b>${cmsEsc((m.first_name || m.display_name).toLocaleUpperCase("tr-TR"))}</b>
      </div>`).join("");
  }

  const track = document.getElementById("memberTrack");
  if (track) {
    track.innerHTML = members.map((m, i) => {
      const number = String(i + 1).padStart(2, "0");
      const tags = (m.tags || []).map((tag) => `<span>${cmsEsc(tag)}</span>`).join("");
      const socials = [
        memberSocialLink(m.instagram_url, `${m.display_name} Instagram`, "◎"),
        memberSocialLink(m.x_url, `${m.display_name} X`, "𝕏"),
        memberSocialLink(m.tiktok_url, `${m.display_name} TikTok`, "♪"),
      ].join("");
      return `
        <article class="member-slide" data-member="${cmsEsc(m.first_name || m.display_name)}"
                 style="--accent: ${cmsEsc(m.accent_color || "#ff7398")}">
          <div class="member-slide-photo">
            <img alt="${cmsEsc(m.display_name)}" decoding="async" loading="lazy"
                 src="${cmsEsc(cmsUrl(m.photo_url, m.thumbnail_url))}" />
            <span class="member-number">${number}</span>
          </div>
          <div class="member-slide-copy">
            <span class="member-mini">CRUSH MEMBER ${number}</span>
            <h3>${cmsEsc(m.display_name)}</h3>
            <p>${cmsEsc(m.bio || "")}</p>
            <div class="member-tags">${tags}</div>
            <div class="member-socials">${socials}</div>
          </div>
        </article>`;
    }).join("");
  }

  const total = document.querySelector(".members-counter b");
  if (total) total.textContent = String(members.length).padStart(2, "0");
  const kicker = document.querySelector(".members-heading .section-kicker");
  if (kicker) kicker.textContent = `CRUSH MEMBERS · 01—${String(members.length).padStart(2, "0")}`;
}

function videoThumb(v, quality = "hqdefault") {
  return cmsUrl(v.thumbnail_url, v.youtube_id ? `https://img.youtube.com/vi/${encodeURIComponent(v.youtube_id)}/${quality}.jpg` : "");
}

function renderCmsVideos(videos) {
  if (!videos?.length) return;
  const homepage = videos.filter((v) => v.section === "homepage" || v.section === "both");
  const archive = videos.filter((v) => v.section === "archive" || v.section === "both");

  const grid = document.querySelector("#video .video-grid");
  if (grid && homepage.length) {
    grid.innerHTML = homepage.map((v) => `
      <button class="video-card video-trigger" data-title="${cmsEsc(v.title)}" data-video="${cmsEsc(v.youtube_id || "")}">
        <span>
          <img alt="${cmsEsc(v.title)}" decoding="async" loading="lazy"
               src="${cmsEsc(videoThumb(v, "hqdefault"))}" />
          <i>▶</i>
        </span>
        <b>${cmsEsc(String(v.title || "").toLocaleUpperCase("tr-TR"))}</b>
        <small>${cmsEsc(v.category || v.badge || "CRUSH VIDEO")}</small>
      </button>`).join("");
  }

  const stage = document.getElementById("videoCarouselStage");
  if (stage && archive.length) {
    stage.innerHTML = archive.map((v, i) => {
      const no = String(i + 1).padStart(2, "0");
      return `
        <article class="archive-video-card video-trigger"
                 data-index="${i}" data-title="${cmsEsc(v.title)}" data-video="${cmsEsc(v.youtube_id || "")}">
          <div class="archive-thumb">
            <img alt="${cmsEsc(v.title)}" decoding="async" loading="lazy"
                 src="${cmsEsc(videoThumb(v, "maxresdefault"))}" />
            <span class="archive-play">▶</span>
            <small>${cmsEsc(v.badge || v.category || "ARCHIVE")}</small>
          </div>
          <div class="archive-copy">
            <span>${no} · ${cmsEsc(v.badge || v.category || "ARCHIVE")}</span>
            <h3>${cmsEsc(v.title)}</h3>
            <p>${cmsEsc(v.description || "")}</p>
          </div>
        </article>`;
    }).join("");
  }
}


function cmsDateParts(value) {
  const raw = String(value || "");
  const iso = raw.slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return {
    iso,
    date,
    day: String(d).padStart(2, "0"),
    monthShort: new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(date).replace(".", "").toLocaleUpperCase("tr-TR"),
    monthLong: new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date).toLocaleUpperCase("tr-TR"),
    weekday: new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date).toLocaleUpperCase("tr-TR"),
  };
}

function renderCmsEvents(events) {
  const track = document.getElementById("calendarTrack");
  if (!track) return;
  track.innerHTML = (events || []).map((event, i) => {
    const p = cmsDateParts(event.event_date);
    if (!p) return "";
    return `<article class="calendar-card" data-date="${cmsEsc(p.iso)}"${event.url ? ` data-event-url="${cmsEsc(event.url)}" tabindex="0" role="link"` : ""}>
      <div class="calendar-card-top"><span class="calendar-state">—</span><b>${String(i + 1).padStart(2, "0")} / ${String(events.length).padStart(2, "0")}</b></div>
      <div class="calendar-date"><strong>${p.day}</strong><div><span>${p.monthShort}</span><b>${p.weekday}</b></div></div>
      <div class="calendar-copy"><small>${cmsEsc(event.series || event.type || "CRUSH")}</small><h3>${cmsEsc(event.title)}</h3><p>${cmsEsc(event.description || "")}</p></div>
      <div class="calendar-progress"><i></i></div>
    </article>`;
  }).join("");
  track.querySelectorAll("[data-event-url]").forEach((card) => {
    const open = () => window.open(card.dataset.eventUrl, "_blank", "noopener,noreferrer");
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  const kicker = document.querySelector(".calendar-kicker");
  if (kicker && events?.length) {
    const first = cmsDateParts(events[0].event_date), last = cmsDateParts(events[events.length - 1].event_date);
    kicker.textContent = first && last && first.monthLong === last.monthLong ? `${first.monthLong} ${first.date.getFullYear()} · İÇERİK TAKVİMİ` : "CRUSH · İÇERİK TAKVİMİ";
  }
  updateCalendar();
}

const concertStatusText = {
  coming_soon: "YAKINDA",
  on_sale: "SATIŞTA",
  sold_out: "TÜKENDİ",
  cancelled: "İPTAL",
  completed: "TAMAMLANDI",
};
function renderCmsConcerts(concerts) {
  const list = document.querySelector("#konser .concert-list");
  if (!list) return;
  list.innerHTML = (concerts || []).map((concert, i) => {
    const p = cmsDateParts(concert.concert_date); if (!p) return "";
    const time = String(concert.concert_time || "").slice(0, 5);
    const status = concert.status_text || concertStatusText[concert.status] || String(concert.status || "").toLocaleUpperCase("tr-TR");
    return `<article class="concert-card ${i % 2 ? "concert-card-alt" : ""}">
      <div class="concert-date"><strong>${p.day}</strong><span>${p.monthLong}<br><b>${p.weekday}</b></span></div>
      <div class="concert-info"><small>${i + 1}. GECE${time ? ` · ${cmsEsc(time)}` : ""}</small><h3>${cmsEsc(concert.venue)}</h3><p>${cmsEsc([concert.city, concert.description].filter(Boolean).join(" · "))}</p></div>
      <div class="concert-actions"><span class="sold-chip concert-status-${cmsEsc(concert.status)}">${cmsEsc(status)}</span>${concert.ticket_url ? `<a href="${cmsEsc(concert.ticket_url)}" rel="noopener noreferrer" target="_blank">Bilet / Detay ↗</a>` : ""}</div>
    </article>`;
  }).join("");
  const note = document.querySelector("#konser .concert-note");
  if (note) note.style.display = "none";
}

function renderCmsNews(news) {
  const grid = document.querySelector("#haberler .news-cards");
  if (!grid) return;
  grid.innerHTML = (news || []).map((item) => {
    const p = cmsDateParts(item.published_at); if (!p) return "";
    return `<article class="fresh-news ${item.is_featured ? "featured-news" : ""}">
      <div class="news-date-box"><strong>${p.day}</strong><span>${p.monthShort}</span></div>
      <div class="fresh-news-copy"><small>${cmsEsc(item.category || "CRUSH · HABER")}</small><h3>${cmsEsc(item.title)}</h3><p>${cmsEsc(item.summary || "")}</p>${item.external_url ? `<a href="${cmsEsc(item.external_url)}" rel="noopener noreferrer" target="_blank">Detayları gör ↗</a>` : ""}</div>
    </article>`;
  }).join("");
}

function renderCmsAnnouncement(items) {
  const box = document.querySelector("aside.announcement");
  if (!box) return;
  const item = items?.[0];
  if (!item) { box.style.display = "none"; return; }
  box.style.removeProperty("display");
  const link = item.url ? (String(item.url).startsWith("#") ? `<a href="${cmsEsc(item.url)}">Detayları gör →</a>` : `<a href="${cmsEsc(item.url)}" rel="noopener noreferrer" target="_blank">Detayları gör →</a>`) : "";
  box.innerHTML = `<strong>📣 &nbsp; CRUSH DUYURU</strong><span>${cmsEsc(item.message)}</span>${link}`;
}

function renderFeaturedTrack(track) {
  if (!track) return;
  const cover = cmsUrl(track.cover_url, "images/crush-cover.webp");
  const audio = cmsUrl(track.audio_url, "audio/crush.m4a");
  document.querySelectorAll("#nowPlaying img, #recordSleeve img").forEach((img) => {
    img.src = cover;
    img.alt = `${track.title || "CRUSH"} kapağı`;
  });
  const label = document.querySelector("#nowPlaying strong");
  if (label) label.textContent = `${track.title || "CRUSH!"} — ${track.subtitle || "CRUSH"}`;

  const audioEl = document.getElementById("crushAudio");
  if (audioEl && audio) {
    audioEl.innerHTML = "";
    const source = document.createElement("source");
    source.src = audio;
    source.type = audio.toLowerCase().includes(".m4a") ? "audio/mp4" : "audio/mpeg";
    audioEl.appendChild(source);
    audioEl.load();
  }
}

async function hydrateCrushCms() {
  if (!cmsReady || !cmsDb) return;
  try {
    const [membersRes, videosRes, musicRes, eventsRes, concertsRes, newsRes, announcementsRes] = await Promise.all([
      cmsDb.from("members").select("*").eq("is_active", true).order("display_order", { ascending: true }),
      cmsDb.from("videos").select("*").eq("is_visible", true).order("display_order", { ascending: true }),
      cmsDb.from("music_tracks").select("*").eq("is_active", true).order("is_featured", { ascending: false }).order("display_order", { ascending: true }),
      cmsDb.from("events").select("*").eq("is_visible", true).eq("status", "published").order("event_date", { ascending: true }).order("display_order", { ascending: true }),
      cmsDb.from("concerts").select("*").eq("is_visible", true).order("concert_date", { ascending: true }).order("concert_time", { ascending: true }),
      cmsDb.from("news").select("*").eq("is_visible", true).order("is_featured", { ascending: false }).order("published_at", { ascending: false }),
      cmsDb.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1),
    ]);
    [membersRes, videosRes, musicRes, eventsRes, concertsRes, newsRes, announcementsRes].forEach((r) => { if (r.error) throw r.error; });

    if (membersRes.data?.length) renderCmsMembers(membersRes.data);
    if (videosRes.data?.length) renderCmsVideos(videosRes.data);
    if (musicRes.data?.length) renderFeaturedTrack(musicRes.data[0]);
    renderCmsEvents(eventsRes.data || []);
    renderCmsConcerts(concertsRes.data || []);
    renderCmsNews(newsRes.data || []);
    renderCmsAnnouncement(announcementsRes.data || []);
    document.documentElement.dataset.cms = "ready";
  } catch (error) {
    console.warn("CRUSH CMS içeriği yüklenemedi; statik fallback kullanılıyor:", error);
    document.documentElement.dataset.cms = "fallback";
  }
}

await hydrateCrushCms();

document.addEventListener("keydown", (e) => {
  if (e.key === "F12") {
    e.preventDefault();
  }

  if (e.ctrlKey && e.shiftKey && e.key === "I") {
    e.preventDefault();
  }
});

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// Image fallbacks are bound from JS so Content Security Policy can stay strict.
document.querySelectorAll(".member-photo img").forEach((img) => {
  img.addEventListener("error", () => {
    img.hidden = true;
    const fallback = img.nextElementSibling;
    if (fallback) fallback.hidden = false;
  });
});

const storyPhoto = document.querySelector(".story-photo-card > img");
if (storyPhoto) {
  storyPhoto.addEventListener("error", () => {
    storyPhoto.style.display = "none";
    const fallback = storyPhoto.nextElementSibling;
    if (fallback) fallback.style.display = "grid";
  });
}

const hero = document.querySelector(".hero");
const sleeve = document.getElementById("recordSleeve");
const platter = document.getElementById("platter");
const flight = document.getElementById("recordFlight");
const recordOnPlatter = document.getElementById("recordOnPlatter");
const deckButton = document.getElementById("deckButton");
const deckIcon = document.getElementById("deckIcon");
const playStatus = document.getElementById("playStatus");
const nowPlaying = document.getElementById("nowPlaying");
const crushAudio = document.getElementById("crushAudio");
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
  if (!crushAudio) {
    console.warn("crushAudio elementi bulunamadı.");
    return;
  }

  if (on) {
    crushAudio.muted = false;
    crushAudio.volume = 1;

    const playPromise = crushAudio.play();

    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Ses oynatılamadı:", error);
      });
    }
  } else {
    crushAudio.pause();
  }
}

function playRecord() {
  if (playing || animating) return;
  animating = true;
  const sleeveRect = sleeve.getBoundingClientRect();
  const platterRect = platter.getBoundingClientRect();

  hero.classList.remove("returning");
  recordOnPlatter.classList.remove("visible", "spinning");
  flight.classList.remove("moving", "spinning");
  flight.style.zIndex = "23"; // kılıfın arkasında başlar
  flight.style.opacity = "1";
  flight.style.transform = transformForRect(sleeveRect, 0.77);
  playStatus.textContent = "PLACING VINYL";
  deckIcon.classList.remove("is-play");
  deckIcon.classList.add("is-pause");
  setAudio(true);

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      flight.classList.add("moving");
      // Kılıftan çıkmaya başladıktan sonra ön katmana alınır.
      window.setTimeout(() => {
        flight.style.zIndex = "26";
      }, 180);
      flight.style.transform = transformForRect(platterRect, 0.93);
    }),
  );

  window.setTimeout(() => {
    // Pikaba ulaştığında global uçan plak yerine pikabın içindeki plak gösterilir.
    flight.style.opacity = "0";
    flight.classList.remove("moving");
    recordOnPlatter.classList.add("visible", "spinning");
    playing = true;
    animating = false;
    hero.classList.add("playing");
    nowPlaying.classList.add("playing");
    playStatus.textContent = "NOW PLAYING";
  }, 1020);
}

function stopRecord() {
  if ((!playing && !animating) || hero.classList.contains("returning")) return;
  playing = false;
  animating = true;
  setAudio(false);
  hero.classList.remove("playing");
  hero.classList.add("returning");
  nowPlaying.classList.remove("playing");
  deckIcon.classList.remove("is-pause");
  deckIcon.classList.add("is-play");
  playStatus.textContent = "RETURNING TO SLEEVE";

  const platterRect = platter.getBoundingClientRect();
  const sleeveRect = sleeve.getBoundingClientRect();

  // Pikaptaki yerleşik plağı uçan plağa dönüştür.
  recordOnPlatter.classList.remove("spinning", "visible");
  flight.classList.remove("moving", "spinning");
  flight.style.zIndex = "26";
  flight.style.opacity = "1";
  flight.style.transform = transformForRect(platterRect, 0.93);

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      flight.classList.add("moving");
      flight.style.transform = transformForRect(sleeveRect, 0.77);
      // Kılıfa yaklaşırken plak önden arkaya alınır; böylece gerçekten içine giriyormuş gibi kaybolur.
      window.setTimeout(() => {
        flight.style.zIndex = "23";
      }, 700);
    }),
  );

  window.setTimeout(() => {
    flight.style.opacity = "0";
    flight.classList.remove("moving");
    hero.classList.remove("returning");
    playStatus.textContent = "READY TO PLAY";
    animating = false;
  }, 1000);
}

function toggleRecord() {
  if (playing || hero.classList.contains("returning")) stopRecord();
  else playRecord();
}

sleeve.addEventListener("click", toggleRecord);
deckButton.addEventListener("click", toggleRecord);

window.addEventListener("resize", () => {});

const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");
navToggle.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
});
mainNav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }),
);

const modal = document.getElementById("videoModal");
const frame = document.getElementById("videoFrame");
const modalTitle = document.getElementById("modalTitle");

function openVideo(button) {
  const id = button.dataset.video;
  const title = button.dataset.title || "CRUSH Video";
  if (playing) stopRecord();
  modalTitle.textContent = title;
  frame.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeVideo() {
  frame.src = "about:blank";
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest(".video-trigger");
  if (!btn || event.defaultPrevented) return;
  openVideo(btn);
});
document
  .querySelectorAll("[data-close-modal]")
  .forEach((btn) => btn.addEventListener("click", closeVideo));
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeVideo();
});

// ===== NAVBAR SCROLLSPY =====
const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
const header = document.querySelector(".site-header");
const navTargets = navLinks
  .map((link) => ({
    link,
    target: document.querySelector(link.getAttribute("href")),
  }))
  .filter((item) => item.target);

function updateActiveNav() {
  const marker = window.scrollY + (header?.offsetHeight || 0) + 120;
  const passed = navTargets
    .map((item) => ({
      ...item,
      top: item.target.getBoundingClientRect().top + window.scrollY,
    }))
    .filter((item) => item.top <= marker)
    .sort((a, b) => b.top - a.top);
  const current = passed[0] || navTargets[0];
  navLinks.forEach((link) =>
    link.classList.toggle("active", link === current?.link),
  );
}
window.addEventListener("scroll", updateActiveNav, { passive: true });
window.addEventListener("resize", updateActiveNav);
navLinks.forEach((link) =>
  link.addEventListener("click", () => {
    navLinks.forEach((l) => l.classList.toggle("active", l === link));
  }),
);
updateActiveNav();

// ===== DYNAMIC CONTENT CALENDAR =====
const focusDay = document.getElementById("focusDay");
const focusMonth = document.getElementById("focusMonth");
const focusStatus = document.getElementById("focusStatus");
const monthNames = [
  "OCAK",
  "ŞUBAT",
  "MART",
  "NİSAN",
  "MAYIS",
  "HAZİRAN",
  "TEMMUZ",
  "AĞUSTOS",
  "EYLÜL",
  "EKİM",
  "KASIM",
  "ARALIK",
];

function localDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function parseLocalISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function diffDays(a, b) {
  return Math.round((localDay(a) - localDay(b)) / 86400000);
}
function calendarLabel(diff) {
  if (diff < 0) return "YAYINLANDI";
  if (diff === 0) return "BUGÜN";
  if (diff === 1) return "YARIN";
  return diff <= 5 ? `${diff} GÜN SONRA` : "YAKINDA";
}
function updateCalendar() {
  const calendarCards = [...document.querySelectorAll(".calendar-card[data-date]")];
  const today = localDay(new Date());
  let focus = null;
  let firstFuture = null;
  calendarCards.forEach((card) => {
    const date = parseLocalISO(card.dataset.date);
    const diff = diffDays(date, today);
    const state = card.querySelector(".calendar-state");
    card.classList.remove(
      "is-published",
      "is-today",
      "is-tomorrow",
      "is-next",
      "is-focus",
    );
    state.textContent = calendarLabel(diff);
    if (diff < 0) card.classList.add("is-published");
    else if (diff === 0) {
      card.classList.add("is-today");
      focus = { card, date, diff };
    } else if (diff === 1) {
      card.classList.add("is-tomorrow");
      if (!focus) focus = { card, date, diff };
    } else if (!firstFuture) firstFuture = { card, date, diff };
  });
  if (!focus) focus = firstFuture;
  if (focus) {
    if (
      !focus.card.classList.contains("is-today") &&
      !focus.card.classList.contains("is-tomorrow")
    )
      focus.card.classList.add("is-next");
    focus.card.classList.add("is-focus");
    focusDay.textContent = String(focus.date.getDate()).padStart(2, "0");
    focusMonth.textContent = monthNames[focus.date.getMonth()];
    focusStatus.textContent = calendarLabel(focus.diff);
  } else if (calendarCards.length) {
    const last = calendarCards[calendarCards.length - 1];
    const date = parseLocalISO(last.dataset.date);
    last.classList.add("is-focus");
    focusDay.textContent = String(date.getDate()).padStart(2, "0");
    focusMonth.textContent = monthNames[date.getMonth()];
    focusStatus.textContent = "TAMAMLANDI";
  }
}
updateCalendar();
// Sayfa uzun süre açık kalırsa gece yarısından sonra da durum yenilensin.
setInterval(updateCalendar, 60 * 60 * 1000);

// ===== FULL MEMBER CAROUSEL =====
const membersCarousel = document.getElementById("membersCarousel");
const memberViewport = document.getElementById("memberViewport");
const memberTrack = document.getElementById("memberTrack");
const memberSlides = memberTrack
  ? [...memberTrack.querySelectorAll(".member-slide")]
  : [];
const memberPrevFull = document.getElementById("memberPrevFull");
const memberNextFull = document.getElementById("memberNextFull");
const memberDotsFull = document.getElementById("memberDotsFull");
const memberCurrentFull = document.getElementById("memberCurrentFull");
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
  memberViewport?.style.setProperty("--deck-drag", "0px");

  const prevIndex = memberClampIndex(fullMemberIndex - 1);
  const nextIndex = memberClampIndex(fullMemberIndex + 1);

  memberSlides.forEach((slide, i) => {
    const active = i === fullMemberIndex;
    const prev = i === prevIndex;
    const next = i === nextIndex;

    slide.classList.toggle("is-active", active);
    slide.classList.toggle("is-prev", prev);
    slide.classList.toggle("is-next", next);
    slide.classList.toggle("is-hidden", !active && !prev && !next);
    slide.setAttribute("aria-hidden", active ? "false" : "true");
    slide.style.zIndex = active ? "5" : prev || next ? "3" : "1";
  });

  if (memberCurrentFull)
    memberCurrentFull.textContent = String(fullMemberIndex + 1).padStart(
      2,
      "0",
    );
  [...(memberDotsFull?.children || [])].forEach((dot, i) => {
    dot.classList.toggle("active", i === fullMemberIndex);
    dot.setAttribute("aria-current", i === fullMemberIndex ? "true" : "false");
  });

  const railName = document.getElementById("memberRailName");
  const railProgress = document.getElementById("memberRailProgress");
  if (railName)
    railName.textContent = String(
      memberSlides[fullMemberIndex]?.dataset.member || "",
    ).toLocaleUpperCase("tr-TR");
  if (railProgress)
    railProgress.style.width = `${((fullMemberIndex + 1) / memberSlides.length) * 100}%`;
}

if (memberDotsFull && memberSlides.length) {
  memberSlides.forEach((slide, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute(
      "aria-label",
      `${slide.dataset.member || `Üye ${i + 1}`} kartını göster`,
    );
    dot.addEventListener("click", () => renderFullMember(i));
    memberDotsFull.appendChild(dot);
  });
}

memberPrevFull?.addEventListener("click", () =>
  renderFullMember(fullMemberIndex - 1),
);
memberNextFull?.addEventListener("click", () =>
  renderFullMember(fullMemberIndex + 1),
);

memberViewport?.addEventListener("keydown", (event) => {
  if (event.target.closest("a,button,input,textarea,select")) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    renderFullMember(fullMemberIndex - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    renderFullMember(fullMemberIndex + 1);
  }
});

memberViewport?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("a,button")) return;
  memberPointerId = event.pointerId;
  memberStartX = event.clientX;
  memberStartY = event.clientY;
  memberDeltaX = 0;
  memberDragging = true;
  memberSuppressClick = false;
  memberViewport.setPointerCapture?.(event.pointerId);
  memberTrack?.classList.add("is-dragging");
});

memberViewport?.addEventListener("pointermove", (event) => {
  if (!memberDragging || event.pointerId !== memberPointerId || !memberTrack)
    return;
  const dx = event.clientX - memberStartX;
  const dy = event.clientY - memberStartY;
  memberDeltaX = dx;

  // Dikey kaydırma niyeti varsa carousel yatay hareketi ele geçirmez.
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) return;
  if (Math.abs(dx) > 7) memberSuppressClick = true;

  // Geçiş yalnızca pointer bırakıldığında yapılır; sürüklerken kartları sürekli
  // yeniden transform etmek yerine hafif bir cursor state kullanmak daha akıcıdır.
  memberViewport.classList.toggle("is-swipe-left", dx < -18);
  memberViewport.classList.toggle("is-swipe-right", dx > 18);
});

function finishMemberSwipe(event) {
  if (!memberDragging || (event && event.pointerId !== memberPointerId)) return;
  const dx = memberDeltaX;
  const threshold = Math.min(
    90,
    Math.max(48, (memberViewport?.clientWidth || 400) * 0.12),
  );
  memberDragging = false;
  memberPointerId = null;
  memberTrack?.classList.remove("is-dragging");
  memberViewport?.style.setProperty("--deck-drag", "0px");
  memberViewport?.classList.remove("is-swipe-left", "is-swipe-right");

  if (Math.abs(dx) >= threshold)
    renderFullMember(fullMemberIndex + (dx < 0 ? 1 : -1));
  else renderFullMember(fullMemberIndex);

  window.setTimeout(() => {
    memberSuppressClick = false;
  }, 80);
}

memberViewport?.addEventListener("pointerup", finishMemberSwipe);
memberViewport?.addEventListener("pointercancel", finishMemberSwipe);
memberViewport?.addEventListener("lostpointercapture", (event) => {
  if (memberDragging) finishMemberSwipe(event);
});

// Swipe sonrası yanlışlıkla sosyal bağlantıya tıklanmasını engeller.
memberViewport?.addEventListener(
  "click",
  (event) => {
    if (memberSuppressClick) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true,
);

renderFullMember(0, false);
window.addEventListener("resize", () =>
  renderFullMember(fullMemberIndex, false),
);
requestAnimationFrame(() => memberTrack?.classList.remove("is-dragging"));

// Story alanı ekrana geldiğinde hafif giriş animasyonu.
const storyReveal = document.querySelector(".reveal-story");
if (storyReveal && "IntersectionObserver" in window) {
  const storyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("story-visible");
          storyObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );
  storyObserver.observe(storyReveal);
}

// ===== FIX 5 · 3D VIDEO ARCHIVE CAROUSEL =====
const videoCarousel = document.getElementById("videoCarousel");
const archiveCards = [...document.querySelectorAll(".archive-video-card")];
const archivePrev = document.getElementById("videoArchivePrev");
const archiveNext = document.getElementById("videoArchiveNext");
const archiveDots = document.getElementById("videoArchiveDots");
const archiveCurrent = document.getElementById("archiveCurrent");
const archiveTotal = document.getElementById("archiveTotal");
let archiveIndex = 0;
let archivePointerId = null;
let archiveStartX = 0;
let archiveStartY = 0;
let archiveDragging = false;
let archiveMoved = false;

if (archiveTotal)
  archiveTotal.textContent = String(archiveCards.length).padStart(2, "0");

function archiveOffset(index, active) {
  let offset = index - active;
  const total = archiveCards.length;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function renderArchive(index) {
  if (!archiveCards.length) return;
  archiveIndex = (index + archiveCards.length) % archiveCards.length;
  const compact = window.innerWidth < 680;
  archiveCards.forEach((card, i) => {
    const off = archiveOffset(i, archiveIndex);
    const abs = Math.abs(off);
    const step = compact ? 105 : 245;
    const x = off * step;
    const z = abs === 0 ? 120 : 10 - abs * 70;
    const r = off * (compact ? -22 : -28);
    const scale = abs === 0 ? 1 : Math.max(0.66, 0.88 - abs * 0.08);
    const opacity = abs > 2 ? 0 : Math.max(0.3, 1 - abs * 0.2);
    card.style.setProperty("--card-x", `${x}px`);
    card.style.setProperty("--card-z", `${z}px`);
    card.style.setProperty("--card-r", `${r}deg`);
    card.style.setProperty("--card-scale", scale);
    card.style.setProperty("--card-opacity", opacity);
    card.style.zIndex = String(20 - abs);
    card.classList.toggle("is-active", i === archiveIndex);
    card.setAttribute("aria-hidden", i === archiveIndex ? "false" : "true");
  });
  if (archiveCurrent)
    archiveCurrent.textContent = String(archiveIndex + 1).padStart(2, "0");
  [...(archiveDots?.children || [])].forEach((dot, i) =>
    dot.classList.toggle("active", i === archiveIndex),
  );
}

if (archiveDots && archiveCards.length) {
  archiveCards.forEach((card, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `${i + 1}. videoyu seç`);
    dot.addEventListener("click", () => renderArchive(i));
    archiveDots.appendChild(dot);
    card.addEventListener(
      "click",
      (event) => {
        if (archiveMoved) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (i !== archiveIndex) {
          event.preventDefault();
          event.stopPropagation();
          renderArchive(i);
        }
      },
      true,
    );
  });
}
archivePrev?.addEventListener("click", () => renderArchive(archiveIndex - 1));
archiveNext?.addEventListener("click", () => renderArchive(archiveIndex + 1));
videoCarousel?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    renderArchive(archiveIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    renderArchive(archiveIndex + 1);
  }
});
videoCarousel?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest(".video-carousel-arrow"))
    return;
  archivePointerId = event.pointerId;
  archiveStartX = event.clientX;
  archiveStartY = event.clientY;
  archiveDragging = true;
  archiveMoved = false;
  videoCarousel.setPointerCapture?.(event.pointerId);
});
videoCarousel?.addEventListener("pointermove", (event) => {
  if (!archiveDragging || event.pointerId !== archivePointerId) return;
  const dx = event.clientX - archiveStartX;
  const dy = event.clientY - archiveStartY;
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) return;
  if (Math.abs(dx) > 10) archiveMoved = true;
});
function finishArchiveSwipe(event) {
  if (!archiveDragging || (event && event.pointerId !== archivePointerId))
    return;
  const dx = event.clientX - archiveStartX;
  archiveDragging = false;
  archivePointerId = null;
  if (Math.abs(dx) > 55) renderArchive(archiveIndex + (dx < 0 ? 1 : -1));
  window.setTimeout(() => {
    archiveMoved = false;
  }, 120);
}
videoCarousel?.addEventListener("pointerup", finishArchiveSwipe);
videoCarousel?.addEventListener("pointercancel", finishArchiveSwipe);
window.addEventListener("resize", () => renderArchive(archiveIndex));
renderArchive(0);

// ===== FIX 7 · CRUSH LETTER STUDIO =====
const letterStudio = document.getElementById("letterStudio");
const letterEnvelope = document.getElementById("letterEnvelope");
const letterDesk = document.getElementById("letterDesk");
const closeLetterStudioBtn = document.getElementById("closeLetterStudio");
const letterPaper = document.getElementById("letterPaper");
const letterEditor = document.getElementById("letterEditor");
const letterCanvas = document.getElementById("letterCanvas");
const letterInk = document.getElementById("letterInk");
const letterTools = [...document.querySelectorAll("[data-letter-mode]")];
const letterModeStatus = document.getElementById("letterModeStatus");
const clearLetterDrawing = document.getElementById("clearLetterDrawing");
const openSenderForm = document.getElementById("openSenderForm");
const senderForm = document.getElementById("senderForm");
const closeSenderForm = document.getElementById("closeSenderForm");
const letterSubmitNote = document.getElementById("letterSubmitNote");
const letterThemeOptions = [
  ...document.querySelectorAll("[data-letter-theme]"),
];
const letterThemeName = document.getElementById("letterThemeName");
const letterThemeField = document.getElementById("letterThemeField");
const magicPenCursor = document.getElementById("magicPenCursor");
const penSparkleLayer = document.getElementById("penSparkleLayer");
let selectedLetterTheme = "1";

function setLetterTheme(theme, name) {
  selectedLetterTheme = String(theme || "1");
  letterPaper?.setAttribute("data-theme", selectedLetterTheme);
  letterThemeOptions.forEach((btn) => {
    const active = btn.dataset.letterTheme === selectedLetterTheme;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (letterThemeName)
    letterThemeName.textContent =
      name ||
      letterThemeOptions.find(
        (btn) => btn.dataset.letterTheme === selectedLetterTheme,
      )?.dataset.themeName ||
      "LETTER STYLE";
  if (letterThemeField) letterThemeField.value = selectedLetterTheme;
}
letterThemeOptions.forEach((btn) =>
  btn.addEventListener("click", () =>
    setLetterTheme(btn.dataset.letterTheme, btn.dataset.themeName),
  ),
);
setLetterTheme("1", "BLUE DOODLE");

let letterMode = "write";
let drawing = false;
let lastPoint = null;
let canvasCtx = letterCanvas?.getContext("2d");

function openLetterStudio() {
  if (!letterStudio || letterStudio.classList.contains("is-open")) return;

  letterStudio.classList.remove("is-closing");
  letterStudio.classList.add("is-open");

  letterEnvelope?.setAttribute("aria-expanded", "true");
  letterDesk?.setAttribute("aria-hidden", "false");

  window.setTimeout(() => {
    resizeLetterCanvas(true);
    letterEditor?.focus();
  }, 1150);
}

function closeLetterStudio() {
  if (!letterStudio || !letterStudio.classList.contains("is-open")) return;

  letterStudio.classList.add("is-closing");

  letterEnvelope?.setAttribute("aria-expanded", "false");
  letterDesk?.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    letterStudio.classList.remove("is-open", "is-closing");
  }, 650);
}

letterEnvelope?.addEventListener("click", openLetterStudio);

closeLetterStudioBtn?.addEventListener("click", closeLetterStudio);

function setLetterMode(mode) {
  letterMode = mode;
  letterTools.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.letterMode === mode),
  );
  letterPaper?.classList.remove("write-mode", "draw-mode", "erase-mode");
  letterPaper?.classList.add(`${mode}-mode`);
  if (letterModeStatus)
    letterModeStatus.textContent =
      mode === "write"
        ? "Yazı modu aktif"
        : mode === "draw"
          ? "Süslü kalem modu aktif ✦"
          : "Silgi modu aktif";
  if (mode !== "draw") hideMagicPen();
  if (mode === "write") letterEditor?.focus();
}
letterTools.forEach((btn) =>
  btn.addEventListener("click", () => setLetterMode(btn.dataset.letterMode)),
);
setLetterMode("write");

function resizeLetterCanvas(preserve = true) {
  if (!letterCanvas || !letterPaper || !canvasCtx) return;
  const rect = letterPaper.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let snapshot = null;
  if (preserve && letterCanvas.width && letterCanvas.height) {
    snapshot = document.createElement("canvas");
    snapshot.width = letterCanvas.width;
    snapshot.height = letterCanvas.height;
    snapshot.getContext("2d").drawImage(letterCanvas, 0, 0);
  }
  letterCanvas.width = Math.round(rect.width * dpr);
  letterCanvas.height = Math.round(rect.height * dpr);
  letterCanvas.style.width = `${rect.width}px`;
  letterCanvas.style.height = `${rect.height}px`;
  canvasCtx = letterCanvas.getContext("2d");
  canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasCtx.lineCap = "round";
  canvasCtx.lineJoin = "round";
  if (snapshot)
    canvasCtx.drawImage(
      snapshot,
      0,
      0,
      snapshot.width,
      snapshot.height,
      0,
      0,
      rect.width,
      rect.height,
    );
}
window.addEventListener("resize", () => resizeLetterCanvas(true));

function canvasPoint(event) {
  const rect = letterCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

let lastSparkAt = 0;
function syncMagicPenColor() {
  if (magicPenCursor)
    magicPenCursor.style.setProperty(
      "--pen-color",
      letterInk?.value || "#ff2f92",
    );
}
function positionMagicPen(event) {
  if (!magicPenCursor || !letterPaper || letterMode !== "draw") return;
  const paperRect = letterPaper.getBoundingClientRect();
  magicPenCursor.style.left = `${event.clientX - paperRect.left}px`;
  magicPenCursor.style.top = `${event.clientY - paperRect.top}px`;
  magicPenCursor.classList.add("is-visible");
}
function hideMagicPen() {
  magicPenCursor?.classList.remove("is-visible", "is-drawing");
}
function createPenSparkle(point) {
  if (!penSparkleLayer || letterMode !== "draw") return;
  const now = performance.now();
  if (now - lastSparkAt < 42) return;
  lastSparkAt = now;
  const spark = document.createElement("i");
  spark.className = `pen-sparkle${Math.random() > 0.72 ? " dot" : ""}`;
  spark.style.left = `${point.x + (Math.random() * 8 - 4)}px`;
  spark.style.top = `${point.y + (Math.random() * 8 - 4)}px`;
  spark.style.setProperty("--spark-color", letterInk?.value || "#ff2f92");
  spark.style.setProperty("--sx", `${Math.round(Math.random() * 22 - 11)}px`);
  spark.style.setProperty("--sy", `${Math.round(-8 - Math.random() * 17)}px`);
  penSparkleLayer.appendChild(spark);
  spark.addEventListener("animationend", () => spark.remove(), { once: true });
}
letterInk?.addEventListener("input", syncMagicPenColor);
syncMagicPenColor();
letterCanvas?.addEventListener("pointerenter", (event) =>
  positionMagicPen(event),
);
letterCanvas?.addEventListener("pointerleave", hideMagicPen);
letterCanvas?.addEventListener("pointerdown", (event) => {
  if (letterMode === "write") return;
  positionMagicPen(event);
  drawing = true;
  lastPoint = canvasPoint(event);
  if (letterMode === "draw") magicPenCursor?.classList.add("is-drawing");
  letterCanvas.setPointerCapture?.(event.pointerId);
});
letterCanvas?.addEventListener("pointermove", (event) => {
  positionMagicPen(event);
  if (!drawing || !canvasCtx || letterMode === "write") return;
  const point = canvasPoint(event);
  canvasCtx.save();
  canvasCtx.globalCompositeOperation =
    letterMode === "erase" ? "destination-out" : "source-over";
  canvasCtx.strokeStyle = letterInk?.value || "#ff2f92";
  canvasCtx.lineWidth = letterMode === "erase" ? 24 : 4;
  canvasCtx.beginPath();
  canvasCtx.moveTo(lastPoint.x, lastPoint.y);
  canvasCtx.lineTo(point.x, point.y);
  canvasCtx.stroke();
  canvasCtx.restore();
  if (letterMode === "draw") createPenSparkle(point);
  lastPoint = point;
});
function stopLetterDraw() {
  drawing = false;
  lastPoint = null;
  magicPenCursor?.classList.remove("is-drawing");
}
letterCanvas?.addEventListener("pointerup", stopLetterDraw);
letterCanvas?.addEventListener("pointercancel", stopLetterDraw);
clearLetterDrawing?.addEventListener("click", () => {
  if (!canvasCtx || !letterCanvas) return;
  const rect = letterCanvas.getBoundingClientRect();
  canvasCtx.clearRect(0, 0, rect.width, rect.height);
});

openSenderForm?.addEventListener("click", () => {
  if (!senderForm) return;
  senderForm.hidden = false;
  senderForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
closeSenderForm?.addEventListener("click", () => {
  if (senderForm) senderForm.hidden = true;
});
function letterCanvasHasDrawing() {
  if (!letterCanvas || !canvasCtx) return false;
  try {
    const pixels = canvasCtx.getImageData(0, 0, letterCanvas.width, letterCanvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) return true;
  } catch (_) {}
  return false;
}

function resetLetterAfterSend() {
  if (letterEditor) letterEditor.textContent = "";
  if (canvasCtx && letterCanvas) {
    const rect = letterCanvas.getBoundingClientRect();
    canvasCtx.clearRect(0, 0, rect.width, rect.height);
  }
  senderForm?.reset();
  setLetterTheme("1", "BLUE DOODLE");
}

senderForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!senderForm.reportValidity()) return;

  const message = (letterEditor?.innerText || "").trim();
  if (!message) {
    if (letterSubmitNote) letterSubmitNote.textContent = "Mektubun boş görünüyor. Önce birkaç kelime yazmalısın.";
    letterEditor?.focus();
    return;
  }
  if (message.length > 6000) {
    if (letterSubmitNote) letterSubmitNote.textContent = "Mektup en fazla 6000 karakter olabilir.";
    return;
  }

  if (!window.CRUSH_DB_READY || !window.crushSupabase) {
    if (letterSubmitNote) letterSubmitNote.textContent = "Post Office henüz sunucuya bağlanmadı. Yönetici Supabase ayarlarını tamamlamalı.";
    return;
  }

  const sendButton = document.getElementById("sendLetterBtn");
  const form = new FormData(senderForm);
  sendButton?.setAttribute("disabled", "");
  if (letterSubmitNote) letterSubmitNote.textContent = "Mektubun CRUSH Post Office'e gönderiliyor…";

  try {
    const drawingDataUrl = letterCanvasHasDrawing() ? letterCanvas.toDataURL("image/png") : "";
    const { data, error } = await window.crushSupabase.functions.invoke("submit-letter", {
      body: {
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        message,
        letterTheme: selectedLetterTheme,
        drawingDataUrl,
        website: form.get("website") || "",
        turnstileToken: window.CRUSH_TURNSTILE_TOKEN || "",
      },
    });

    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Mektup gönderilemedi.");

    if (letterSubmitNote) letterSubmitNote.textContent = "Mektubun CRUSH'a ulaştı ♡ Teşekkürler!";
    resetLetterAfterSend();
  } catch (error) {
    console.error("CRUSH letter submit error", error);
    if (letterSubmitNote) letterSubmitNote.textContent = error?.message || "Mektup gönderilemedi. Lütfen biraz sonra tekrar dene.";
  } finally {
    sendButton?.removeAttribute("disabled");
  }
});

})();
