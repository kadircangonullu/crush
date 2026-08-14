const db = window.crushSupabase;
const ready = window.CRUSH_DB_READY;
const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const lettersList = document.getElementById("lettersList");
const letterDetail = document.getElementById("letterDetail");
let letters = [];
let currentFilter = "all";
let activeLetterId = null;
let adminProfile = null;

const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const shortDate = (value) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
      }).format(new Date(value))
    : "—";

function showLogin(message = "") {
  loginPanel.hidden = false;
  dashboard.hidden = true;
  loginStatus.textContent = message;
}
function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
}

async function requireAdmin() {
  if (!ready || !db) {
    showLogin("Supabase bağlantısı henüz yapılandırılmamış.");
    return false;
  }
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    showLogin();
    return false;
  }
  const { data: profile, error } = await db
    .from("admin_profiles")
    .select("display_name,role,is_active")
    .eq("id", user.id)
    .single();
  if (error || !profile?.is_active) {
    await db.auth.signOut();
    showLogin("Bu hesap admin yetkisine sahip değil.");
    return false;
  }
  adminProfile = profile;
  document.getElementById("adminName").textContent =
    profile.display_name || user.email;
  document.getElementById("adminRole").textContent = profile.role.toUpperCase();
  showDashboard();
  await Promise.all([
    loadLetters(),
    loadMembersAdmin(),
    loadVideosAdmin(),
    loadMusicAdmin(),
    loadEventsAdmin(),
    loadConcertsAdmin(),
    loadNewsAdmin(),
    loadAnnouncementsAdmin(),
    loadMediaAdmin(),
    loadSiteSettingsAdmin(),
    loadSocialsAdmin(),
    loadAuditLogs(),
    loadDashboardStats(),
    loadAnalytics(),
  ]);
  return true;
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginStatus.textContent = "Giriş yapılıyor…";
  if (!ready || !db) {
    loginStatus.textContent = "Önce js/supabase-config.js dosyasını doldur.";
    return;
  }
  const form = new FormData(loginForm);
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email")).trim(),
    password: String(form.get("password")),
  });
  if (error) {
    loginStatus.textContent = "Giriş başarısız: " + error.message;
    return;
  }
  await requireAdmin();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await db?.auth.signOut();
  showLogin();
});

async function loadLetters() {
  lettersList.innerHTML =
    '<div class="empty-state">Mektuplar yükleniyor…</div>';
  const { data, error } = await db
    .from("letters")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(250);
  if (error) {
    lettersList.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    return;
  }
  letters = data || [];
  renderOverview();
  renderLetters();
}

function renderOverview() {
  const unread = letters.filter((x) => x.status === "unread").length;
  const favorites = letters.filter(
    (x) => x.is_favorite || x.status === "favorite",
  ).length;
  document.getElementById("totalLetters").textContent = letters.length;
  document.getElementById("newLetters").textContent = unread;
  document.getElementById("favoriteLetters").textContent = favorites;
  document.getElementById("lastLetter").textContent = letters[0]
    ? shortDate(letters[0].submitted_at)
    : "—";
  document.getElementById("unreadBadge").textContent = unread;
  document.getElementById("recentLetters").innerHTML =
    letters
      .slice(0, 6)
      .map(
        (l) =>
          `<div class="recent-item" data-id="${l.id}"><div><strong>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</strong><p>${escapeHtml(l.message)}</p></div><time>${shortDate(l.submitted_at)}</time></div>`,
      )
      .join("") || '<div class="empty-state">Henüz mektup yok.</div>';
  document
    .querySelectorAll(".recent-item")
    .forEach((el) =>
      el.addEventListener("click", () => openLetterView(el.dataset.id)),
    );
}

function filteredLetters() {
  if (currentFilter === "all") return letters;
  if (currentFilter === "favorite")
    return letters.filter((x) => x.is_favorite || x.status === "favorite");
  return letters.filter((x) => x.status === currentFilter);
}
function renderLetters() {
  const list = filteredLetters();
  lettersList.innerHTML =
    list
      .map(
        (l) =>
          `<div class="letter-row ${l.status === "unread" ? "unread" : ""} ${l.id === activeLetterId ? "active" : ""}" data-id="${l.id}"><div class="letter-row-top"><h3>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)} ${l.is_favorite ? "★" : ""}</h3><time>${shortDate(l.submitted_at)}</time></div><p>${escapeHtml(l.message)}</p></div>`,
      )
      .join("") || '<div class="empty-state">Bu filtrede mektup yok.</div>';
  document
    .querySelectorAll(".letter-row")
    .forEach((el) =>
      el.addEventListener("click", () => selectLetter(el.dataset.id)),
    );
}

async function drawingUrl(path) {
  if (!path) return null;
  const { data, error } = await db.storage
    .from("fan-letters")
    .createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
}

async function selectLetter(id) {
  activeLetterId = id;
  renderLetters();
  const l = letters.find((x) => x.id === id);
  if (!l) return;
  if (
    l.status === "unread" &&
    ["owner", "editor"].includes(adminProfile?.role)
  ) {
    const { error } = await db
      .from("letters")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      l.status = "read";
      renderOverview();
      renderLetters();
    }
  }
  const img = await drawingUrl(l.drawing_path);
  letterDetail.className = "letter-detail";
  letterDetail.innerHTML = `<div class="letter-paper-admin" data-theme="${l.letter_theme}"><h2>Dear CRUSH ♡</h2><div class="message">${escapeHtml(l.message)}</div>${img ? `<img class="letter-drawing" src="${escapeHtml(img)}" alt="Gönderenin çizimi" />` : ""}</div><div class="letter-meta"><div class="letter-meta-grid"><div class="meta-chip"><small>GÖNDEREN</small>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</div><div class="meta-chip"><small>E-POSTA</small>${escapeHtml(l.email)}</div><div class="meta-chip"><small>TARİH</small>${fmtDate(l.submitted_at)}</div><div class="meta-chip"><small>KAĞIT STİLİ</small>${l.letter_theme}</div></div><div class="letter-actions-admin"><button class="primary" data-action="favorite">${l.is_favorite ? "★ Favoriden çıkar" : "☆ Favori"}</button><button data-action="archive">Arşivle</button><button data-action="read">Okundu</button></div></div>`;
  letterDetail
    .querySelectorAll("[data-action]")
    .forEach((btn) =>
      btn.addEventListener("click", () => updateLetter(l, btn.dataset.action)),
    );
}

async function updateLetter(letter, action) {
  if (!["owner", "editor"].includes(adminProfile?.role)) return;
  const patch = {};
  if (action === "favorite") {
    patch.is_favorite = !letter.is_favorite;
    patch.status = patch.is_favorite ? "favorite" : "read";
  }
  if (action === "archive") {
    patch.status = "archived";
    patch.archived_at = new Date().toISOString();
  }
  if (action === "read") {
    patch.status = "read";
    patch.read_at = letter.read_at || new Date().toISOString();
  }
  const { error } = await db.from("letters").update(patch).eq("id", letter.id);
  if (error) {
    alert(error.message);
    return;
  }
  Object.assign(letter, patch);
  renderOverview();
  renderLetters();
  await selectLetter(letter.id);
}

function setView(name) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${name}`)?.classList.add("active");
  document
    .querySelectorAll(".nav-btn[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  const titles = {
    overview: "Dashboard",
    analytics: "Analytics",
    letters: "Fan Letters",
    members: "Members",
    videos: "Videos",
    music: "Music",
    calendar: "Calendar",
    concerts: "Concerts",
    news: "News",
    announcements: "Announcements",
    media: "Media Library",
    settings: "Site Settings",
    socials: "Social Links",
    audit: "Audit Logs",
  };
  document.getElementById("viewTitle").textContent = titles[name] || name;
}
function openLetterView(id) {
  setView("letters");
  selectLetter(id);
}
document
  .querySelectorAll(".nav-btn[data-view]")
  .forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
document
  .getElementById("openAllLetters")
  ?.addEventListener("click", () => setView("letters"));
document
  .getElementById("openAuditLogs")
  ?.addEventListener("click", () => setView("audit"));
document
  .getElementById("refreshLetters")
  ?.addEventListener("click", loadLetters);
document.querySelectorAll("#letterFilters [data-filter]").forEach((b) =>
  b.addEventListener("click", () => {
    currentFilter = b.dataset.filter;
    document
      .querySelectorAll("#letterFilters [data-filter]")
      .forEach((x) => x.classList.toggle("active", x === b));
    renderLetters();
  }),
);

// ===== PHASE 2 · CONTENT MANAGEMENT =====
let membersAdmin = [];
let videosAdmin = [];
let musicAdmin = [];
const canEditContent = () => ["owner", "editor"].includes(adminProfile?.role);

function slugify(value = "") {
  return String(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function youtubeId(value = "") {
  const v = String(value).trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  try {
    const url = new URL(v);
    if (url.hostname.includes("youtu.be"))
      return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((x) =>
      ["embed", "shorts", "live"].includes(x),
    );
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
  } catch {}
  return "";
}
function val(form, name) {
  return String(form.elements[name]?.value || "").trim();
}
function checked(form, name) {
  return Boolean(form.elements[name]?.checked);
}
function setFormValue(form, name, value) {
  const el = form.elements[name];
  if (!el) return;
  if (el.type === "checkbox") el.checked = Boolean(value);
  else el.value = value ?? "";
}
function setEditorStatus(id, text = "", isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error", isError);
}
async function uploadPublicAssetDetailed(file, folder, meta = {}) {
  if (!file || !file.size) return null;
  if (file.size > 6 * 1024 * 1024)
    throw new Error(
      "Bu sürümde panelden yüklenen dosya en fazla 6 MB olabilir.",
    );
  const ext = (file.name.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from("crush-public")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  const url = db.storage.from("crush-public").getPublicUrl(path).data.publicUrl;
  const kind =
    meta.kind ||
    (file.type?.startsWith("image/")
      ? "image"
      : file.type?.startsWith("audio/")
        ? "audio"
        : "other");
  const { data: asset, error: catalogError } = await db
    .from("media_assets")
    .insert({
      bucket: "crush-public",
      path,
      kind,
      alt_text: meta.altText || null,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: (await db.auth.getUser()).data.user?.id || null,
    })
    .select("*")
    .single();
  if (catalogError)
    console.warn("Media catalog kaydı oluşturulamadı:", catalogError);
  return { url, path, asset };
}
async function uploadPublicAsset(file, folder) {
  const result = await uploadPublicAssetDetailed(file, folder);
  return result?.url || null;
}
function emptyManager(el, text) {
  if (el) el.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}
function resetEditor(form, titleId, title) {
  form?.reset();
  setFormValue(form, "id", "");
  document.getElementById(titleId).textContent = title;
}

// MEMBERS
async function loadMembersAdmin() {
  const el = document.getElementById("membersAdminList");
  if (!el || !db) return;
  emptyManager(el, "Üyeler yükleniyor…");
  const { data, error } = await db
    .from("members")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  membersAdmin = data || [];
  renderMembersAdmin();
}
function renderMembersAdmin() {
  const el = document.getElementById("membersAdminList");
  if (!el) return;
  el.innerHTML =
    membersAdmin
      .map(
        (m) => `<button class="manager-item" data-member-id="${m.id}">
    <span class="asset-dot"></span>
    <div><strong>${escapeHtml(m.display_name)}</strong><small>#${m.display_order} · ${m.is_active ? "AKTİF" : "GİZLİ"}</small></div>
  </button>`,
      )
      .join("") || '<div class="empty-state">Henüz üye yok.</div>';
  el.querySelectorAll("[data-member-id]").forEach((b) =>
    b.addEventListener("click", () => editMember(b.dataset.memberId)),
  );
}
function editMember(id) {
  const m = membersAdmin.find((x) => x.id === id);
  const f = document.getElementById("memberForm");
  if (!m || !f) return;
  [
    "id",
    "display_name",
    "slug",
    "first_name",
    "last_name",
    "display_order",
    "accent_color",
    "bio",
    "photo_url",
    "instagram_url",
    "x_url",
    "tiktok_url",
    "is_active",
  ].forEach((k) => setFormValue(f, k, m[k]));
  setFormValue(f, "tags", (m.tags || []).join(", "));
  document.getElementById("memberEditorTitle").textContent = m.display_name;
}
document.getElementById("newMemberBtn")?.addEventListener("click", () => {
  const f = document.getElementById("memberForm");
  resetEditor(f, "memberEditorTitle", "Yeni üye");
  setFormValue(f, "display_order", membersAdmin.length + 1);
  setFormValue(f, "accent_color", "#ff7398");
  setFormValue(f, "is_active", true);
});
document
  .getElementById("memberForm")
  ?.elements?.display_name?.addEventListener("input", (e) => {
    const f = document.getElementById("memberForm");
    if (!val(f, "id") && !val(f, "slug"))
      setFormValue(f, "slug", slugify(e.target.value));
  });
document.getElementById("memberForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const f = e.currentTarget;
  setEditorStatus("memberSaveStatus", "Kaydediliyor…");
  try {
    let photo = val(f, "photo_url");
    const file = f.elements.photo_file.files?.[0];
    if (file) photo = await uploadPublicAsset(file, "members");
    const payload = {
      slug: val(f, "slug") || slugify(val(f, "display_name")),
      display_name: val(f, "display_name"),
      first_name: val(f, "first_name"),
      last_name: val(f, "last_name") || null,
      display_order: Number(val(f, "display_order") || 0),
      accent_color: val(f, "accent_color") || "#ff7398",
      bio: val(f, "bio") || null,
      tags: val(f, "tags")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      photo_url: photo || null,
      thumbnail_url: photo || null,
      instagram_url: val(f, "instagram_url") || null,
      x_url: val(f, "x_url") || null,
      tiktok_url: val(f, "tiktok_url") || null,
      is_active: checked(f, "is_active"),
      updated_at: new Date().toISOString(),
    };
    const id = val(f, "id");
    const query = id
      ? db.from("members").update(payload).eq("id", id)
      : db.from("members").insert(payload);
    const { error } = await query;
    if (error) throw error;
    setEditorStatus("memberSaveStatus", "Kaydedildi ✓");
    await loadMembersAdmin();
    if (id) editMember(id);
    else resetEditor(f, "memberEditorTitle", "Üye seç");
  } catch (err) {
    setEditorStatus("memberSaveStatus", err.message, true);
  }
});
document
  .getElementById("deleteMemberBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("memberForm");
    const id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu üyeyi silmek istediğine emin misin?")) return;
    const { error } = await db.from("members").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "memberEditorTitle", "Üye seç");
    await loadMembersAdmin();
  });

// VIDEOS
async function loadVideosAdmin() {
  const el = document.getElementById("videosAdminList");
  if (!el || !db) return;
  emptyManager(el, "Videolar yükleniyor…");
  const { data, error } = await db
    .from("videos")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  videosAdmin = data || [];
  renderVideosAdmin();
}
function renderVideosAdmin() {
  const el = document.getElementById("videosAdminList");
  if (!el) return;
  el.innerHTML =
    videosAdmin
      .map(
        (v) => `<button class="manager-item" data-video-id="${v.id}">
    <span class="asset-icon">▶</span><div><strong>${escapeHtml(v.title)}</strong><small>${escapeHtml(v.section)} · #${v.display_order} · ${v.is_visible ? "AKTİF" : "GİZLİ"}</small></div>
  </button>`,
      )
      .join("") || '<div class="empty-state">Henüz video yok.</div>';
  el.querySelectorAll("[data-video-id]").forEach((b) =>
    b.addEventListener("click", () => editVideo(b.dataset.videoId)),
  );
}
function editVideo(id) {
  const v = videosAdmin.find((x) => x.id === id);
  const f = document.getElementById("videoForm");
  if (!v || !f) return;
  [
    "id",
    "title",
    "category",
    "badge",
    "section",
    "display_order",
    "description",
    "thumbnail_url",
    "is_visible",
    "is_featured",
  ].forEach((k) => setFormValue(f, k, v[k]));
  setFormValue(f, "youtube", v.youtube_id || "");
  document.getElementById("videoEditorTitle").textContent = v.title;
}
document.getElementById("newVideoBtn")?.addEventListener("click", () => {
  const f = document.getElementById("videoForm");
  resetEditor(f, "videoEditorTitle", "Yeni video");
  setFormValue(f, "display_order", videosAdmin.length + 1);
  setFormValue(f, "section", "archive");
  setFormValue(f, "is_visible", true);
});
document.getElementById("videoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const f = e.currentTarget;
  setEditorStatus("videoSaveStatus", "Kaydediliyor…");
  try {
    const yt = youtubeId(val(f, "youtube"));
    if (!yt) throw new Error("Geçerli bir YouTube URL veya video ID gir.");
    const payload = {
      title: val(f, "title"),
      youtube_id: yt,
      description: val(f, "description") || null,
      category: val(f, "category") || null,
      badge: val(f, "badge") || null,
      thumbnail_url:
        val(f, "thumbnail_url") ||
        `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`,
      display_order: Number(val(f, "display_order") || 0),
      section: val(f, "section") || "archive",
      is_featured: checked(f, "is_featured"),
      is_visible: checked(f, "is_visible"),
      updated_at: new Date().toISOString(),
    };
    const id = val(f, "id");
    const query = id
      ? db.from("videos").update(payload).eq("id", id)
      : db.from("videos").insert(payload);
    const { error } = await query;
    if (error) throw error;
    setEditorStatus("videoSaveStatus", "Kaydedildi ✓");
    await loadVideosAdmin();
    if (id) editVideo(id);
    else resetEditor(f, "videoEditorTitle", "Video seç");
  } catch (err) {
    setEditorStatus("videoSaveStatus", err.message, true);
  }
});
document
  .getElementById("deleteVideoBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("videoForm");
    const id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu videoyu silmek istediğine emin misin?")) return;
    const { error } = await db.from("videos").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "videoEditorTitle", "Video seç");
    await loadVideosAdmin();
  });

// MUSIC
async function loadMusicAdmin() {
  const el = document.getElementById("musicAdminList");
  if (!el || !db) return;
  emptyManager(el, "Müzikler yükleniyor…");
  const { data, error } = await db
    .from("music_tracks")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  musicAdmin = data || [];
  renderMusicAdmin();
}
function renderMusicAdmin() {
  const el = document.getElementById("musicAdminList");
  if (!el) return;
  el.innerHTML =
    musicAdmin
      .map(
        (t) => `<button class="manager-item" data-music-id="${t.id}">
    <span class="asset-icon">♫</span><div><strong>${escapeHtml(t.title)}</strong><small>${t.is_featured ? "PIKAP · " : ""}#${t.display_order} · ${t.is_active ? "AKTİF" : "GİZLİ"}</small></div>
  </button>`,
      )
      .join("") || '<div class="empty-state">Henüz parça yok.</div>';
  el.querySelectorAll("[data-music-id]").forEach((b) =>
    b.addEventListener("click", () => editMusic(b.dataset.musicId)),
  );
}
function editMusic(id) {
  const t = musicAdmin.find((x) => x.id === id);
  const f = document.getElementById("musicForm");
  if (!t || !f) return;
  [
    "id",
    "title",
    "subtitle",
    "release_date",
    "display_order",
    "cover_url",
    "audio_url",
    "youtube_url",
    "spotify_url",
    "apple_music_url",
    "is_featured",
    "is_active",
  ].forEach((k) => setFormValue(f, k, t[k]));
  document.getElementById("musicEditorTitle").textContent = t.title;
}
document.getElementById("newMusicBtn")?.addEventListener("click", () => {
  const f = document.getElementById("musicForm");
  resetEditor(f, "musicEditorTitle", "Yeni parça");
  setFormValue(f, "subtitle", "CRUSH");
  setFormValue(f, "display_order", musicAdmin.length + 1);
  setFormValue(f, "is_active", true);
});
document.getElementById("musicForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const f = e.currentTarget;
  setEditorStatus("musicSaveStatus", "Kaydediliyor…");
  try {
    let cover = val(f, "cover_url"),
      audio = val(f, "audio_url");
    const coverFile = f.elements.cover_file.files?.[0],
      audioFile = f.elements.audio_file.files?.[0];
    if (coverFile) cover = await uploadPublicAsset(coverFile, "covers");
    if (audioFile) audio = await uploadPublicAsset(audioFile, "music");
    const featured = checked(f, "is_featured");
    if (featured) {
      const { error: clearError } = await db
        .from("music_tracks")
        .update({ is_featured: false, updated_at: new Date().toISOString() })
        .eq("is_featured", true);
      if (clearError) throw clearError;
    }
    const payload = {
      title: val(f, "title"),
      subtitle: val(f, "subtitle") || null,
      release_date: val(f, "release_date") || null,
      display_order: Number(val(f, "display_order") || 0),
      cover_url: cover || null,
      audio_url: audio || null,
      youtube_url: val(f, "youtube_url") || null,
      spotify_url: val(f, "spotify_url") || null,
      apple_music_url: val(f, "apple_music_url") || null,
      is_featured: featured,
      is_active: checked(f, "is_active"),
      updated_at: new Date().toISOString(),
    };
    const id = val(f, "id");
    const query = id
      ? db.from("music_tracks").update(payload).eq("id", id)
      : db.from("music_tracks").insert(payload);
    const { error } = await query;
    if (error) throw error;
    setEditorStatus("musicSaveStatus", "Kaydedildi ✓");
    await loadMusicAdmin();
    if (id) editMusic(id);
    else resetEditor(f, "musicEditorTitle", "Parça seç");
  } catch (err) {
    setEditorStatus("musicSaveStatus", err.message, true);
  }
});
document
  .getElementById("deleteMusicBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("musicForm");
    const id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu parçayı silmek istediğine emin misin?")) return;
    const { error } = await db.from("music_tracks").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "musicEditorTitle", "Parça seç");
    await loadMusicAdmin();
  });

// ===== PHASE 3 · SCHEDULE, LIVE, NEWS & ANNOUNCEMENTS =====
let eventsAdmin = [];
let concertsAdmin = [];
let concertSourcesAdmin = [];
let newsAdmin = [];
let announcementsAdmin = [];

function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(value) {
  return value ? new Date(value).toISOString() : null;
}
function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}
function timeOnly(value) {
  return value ? String(value).slice(0, 5) : "";
}

// CALENDAR
async function loadEventsAdmin() {
  const el = document.getElementById("eventsAdminList");
  if (!el || !db) return;
  emptyManager(el, "Takvim yükleniyor…");
  const { data, error } = await db
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  eventsAdmin = data || [];
  renderEventsAdmin();
}
function renderEventsAdmin() {
  const el = document.getElementById("eventsAdminList");
  if (!el) return;
  el.innerHTML =
    eventsAdmin
      .map(
        (x) =>
          `<button class="manager-item" data-event-id="${x.id}"><span class="asset-icon">◷</span><div><strong>${escapeHtml(x.title)}</strong><small>${shortDate(x.event_date)} · ${escapeHtml(x.status)} · ${x.is_visible ? "AKTİF" : "GİZLİ"}</small></div></button>`,
      )
      .join("") || '<div class="empty-state">Henüz etkinlik yok.</div>';
  el.querySelectorAll("[data-event-id]").forEach((b) =>
    b.addEventListener("click", () => editEvent(b.dataset.eventId)),
  );
}
function editEvent(id) {
  const x = eventsAdmin.find((v) => v.id === id),
    f = document.getElementById("eventForm");
  if (!x || !f) return;
  [
    "id",
    "title",
    "series",
    "type",
    "display_order",
    "status",
    "description",
    "url",
    "is_visible",
  ].forEach((k) => setFormValue(f, k, x[k]));
  setFormValue(f, "event_date", toLocalInput(x.event_date));
  document.getElementById("eventEditorTitle").textContent = x.title;
}
document.getElementById("newEventBtn")?.addEventListener("click", () => {
  const f = document.getElementById("eventForm");
  resetEditor(f, "eventEditorTitle", "Yeni etkinlik");
  setFormValue(f, "display_order", eventsAdmin.length + 1);
  setFormValue(f, "status", "published");
  setFormValue(f, "is_visible", true);
});
document.getElementById("eventForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const f = e.currentTarget;
  setEditorStatus("eventSaveStatus", "Kaydediliyor…");
  try {
    const payload = {
      title: val(f, "title"),
      series: val(f, "series") || null,
      description: val(f, "description") || null,
      event_date: localInputToIso(val(f, "event_date")),
      type: val(f, "type") || null,
      url: val(f, "url") || null,
      display_order: Number(val(f, "display_order") || 0),
      status: val(f, "status") || "published",
      is_visible: checked(f, "is_visible"),
      updated_at: new Date().toISOString(),
    };
    const id = val(f, "id"),
      query = id
        ? db.from("events").update(payload).eq("id", id)
        : db.from("events").insert(payload);
    const { error } = await query;
    if (error) throw error;
    setEditorStatus("eventSaveStatus", "Kaydedildi ✓");
    await loadEventsAdmin();
    if (id) editEvent(id);
    else resetEditor(f, "eventEditorTitle", "Etkinlik seç");
  } catch (err) {
    setEditorStatus("eventSaveStatus", err.message, true);
  }
});
document
  .getElementById("deleteEventBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("eventForm"),
      id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu etkinliği silmek istediğine emin misin?")) return;
    const { error } = await db.from("events").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "eventEditorTitle", "Etkinlik seç");
    await loadEventsAdmin();
  });

// CONCERTS
async function loadConcertsAdmin() {
  const el = document.getElementById("concertsAdminList");
  if (!el || !db) return;
  emptyManager(el, "Konserler yükleniyor…");
  const [{ data, error }, { data: sources, error: sourceError }] =
    await Promise.all([
      db
        .from("concerts")
        .select("*")
        .order("concert_date", { ascending: true })
        .order("concert_time", { ascending: true }),
      db
        .from("concert_sources")
        .select("*")
        .order("provider", { ascending: true }),
    ]);
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  concertsAdmin = data || [];
  concertSourcesAdmin = sourceError ? [] : sources || [];
  renderConcertsAdmin();
  renderConcertSyncStatus();
}
function renderConcertsAdmin() {
  const el = document.getElementById("concertsAdminList");
  if (!el) return;
  el.innerHTML =
    concertsAdmin
      .map(
        (x) =>
          `<button class="manager-item" data-concert-id="${x.id}"><span class="asset-icon">♬</span><div><strong>${escapeHtml(x.venue)}</strong><small>${escapeHtml(x.concert_date)} · ${escapeHtml(x.status)} · ${x.source === "bubilet" && x.auto_sync ? "BUBİLET AUTO" : "MANUEL"}${x.manual_override ? " · OVERRIDE" : ""} · ${x.is_visible ? "AKTİF" : "GİZLİ"}</small></div></button>`,
      )
      .join("") || '<div class="empty-state">Henüz konser yok.</div>';
  el.querySelectorAll("[data-concert-id]").forEach((b) =>
    b.addEventListener("click", () => editConcert(b.dataset.concertId)),
  );
}
function renderConcertSyncStatus() {
  const el = document.getElementById("bubiletSyncStatus");
  if (!el) return;
  const src = concertSourcesAdmin.find((x) => x.provider === "bubilet");
  if (!src) {
    el.className = "sync-strip error";
    el.textContent =
      "Bubilet kaynağı bulunamadı. 004 migration çalıştırılmalı.";
    return;
  }
  const when = src.last_sync_at
    ? fmtDate(src.last_sync_at)
    : "Henüz senkron yapılmadı";
  el.className = `sync-strip ${src.last_sync_status === "success" ? "ok" : src.last_sync_status === "error" ? "error" : ""}`;
  el.textContent = `Bubilet AUTO · ${when}${src.last_sync_message ? " · " + src.last_sync_message : ""}`;
}
function editConcert(id) {
  const x = concertsAdmin.find((v) => v.id === id),
    f = document.getElementById("concertForm");
  if (!x || !f) return;
  [
    "id",
    "venue",
    "city",
    "status",
    "status_text",
    "description",
    "ticket_url",
    "is_visible",
    "auto_sync",
    "manual_override",
  ].forEach((k) => setFormValue(f, k, x[k]));
  setFormValue(f, "concert_date", dateOnly(x.concert_date));
  setFormValue(f, "concert_time", timeOnly(x.concert_time));
  document.getElementById("concertEditorTitle").textContent = x.venue;
  document.getElementById("concertAutoSource").textContent =
    x.source === "bubilet" ? "Bubilet · Otomatik keşif" : "Manuel kayıt";
  document.getElementById("concertLastSync").textContent = x.last_synced_at
    ? `Son sync: ${fmtDate(x.last_synced_at)} · Algılanan: ${x.detected_status || "—"}`
    : "Henüz senkronlanmadı";
}
document.getElementById("newConcertBtn")?.addEventListener("click", () => {
  const f = document.getElementById("concertForm");
  resetEditor(f, "concertEditorTitle", "Yeni konser");
  setFormValue(f, "status", "coming_soon");
  setFormValue(f, "is_visible", true);
  setFormValue(f, "auto_sync", false);
  setFormValue(f, "manual_override", true);
  document.getElementById("concertAutoSource").textContent = "Manuel kayıt";
  document.getElementById("concertLastSync").textContent = "—";
});
document
  .getElementById("concertForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
    const f = e.currentTarget;
    setEditorStatus("concertSaveStatus", "Kaydediliyor…");
    try {
      const payload = {
        venue: val(f, "venue"),
        city: val(f, "city") || null,
        concert_date: val(f, "concert_date"),
        concert_time: val(f, "concert_time") || null,
        ticket_url: val(f, "ticket_url") || null,
        status: val(f, "status") || "coming_soon",
        status_text: val(f, "status_text") || null,
        description: val(f, "description") || null,
        is_visible: checked(f, "is_visible"),
        auto_sync: checked(f, "auto_sync"),
        manual_override: checked(f, "manual_override"),
        updated_at: new Date().toISOString(),
      };
      const id = val(f, "id"),
        query = id
          ? db.from("concerts").update(payload).eq("id", id)
          : db.from("concerts").insert(payload);
      const { error } = await query;
      if (error) throw error;
      setEditorStatus("concertSaveStatus", "Kaydedildi ✓");
      await loadConcertsAdmin();
      if (id) editConcert(id);
      else resetEditor(f, "concertEditorTitle", "Konser seç");
    } catch (err) {
      setEditorStatus("concertSaveStatus", err.message, true);
    }
  });
document
  .getElementById("deleteConcertBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("concertForm"),
      id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu konseri silmek istediğine emin misin?")) return;
    const { error } = await db.from("concerts").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "concertEditorTitle", "Konser seç");
    await loadConcertsAdmin();
  });

document
  .getElementById("syncBubiletBtn")
  ?.addEventListener("click", async () => {
    if (!canEditContent()) return alert("Bu hesap senkron başlatamaz.");
    const btn = document.getElementById("syncBubiletBtn"),
      status = document.getElementById("bubiletSyncStatus");
    btn.disabled = true;
    if (status) {
      status.className = "sync-strip busy";
      status.textContent = "Bubilet kontrol ediliyor…";
    }
    try {
      const { data, error } = await db.functions.invoke("sync-bubilet", {
        body: { trigger: "admin" },
      });
      if (error) throw error;
      if (!data?.ok)
        throw new Error(
          data?.sources
            ?.map((x) => x.error)
            .filter(Boolean)
            .join(" · ") || "Senkron tamamlanamadı.",
        );
      await loadConcertsAdmin();
    } catch (err) {
      if (status) {
        status.className = "sync-strip error";
        status.textContent = `Bubilet sync hatası · ${err.message}`;
      }
    } finally {
      btn.disabled = false;
    }
  });

// NEWS
async function loadNewsAdmin() {
  const el = document.getElementById("newsAdminList");
  if (!el || !db) return;
  emptyManager(el, "Haberler yükleniyor…");
  const { data, error } = await db
    .from("news")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  newsAdmin = data || [];
  renderNewsAdmin();
}
function renderNewsAdmin() {
  const el = document.getElementById("newsAdminList");
  if (!el) return;
  el.innerHTML =
    newsAdmin
      .map(
        (x) =>
          `<button class="manager-item" data-news-id="${x.id}"><span class="asset-icon">N</span><div><strong>${escapeHtml(x.title)}</strong><small>${x.is_featured ? "ÖNE ÇIKAN · " : ""}${shortDate(x.published_at)} · ${x.is_visible ? "AKTİF" : "GİZLİ"}</small></div></button>`,
      )
      .join("") || '<div class="empty-state">Henüz haber yok.</div>';
  el.querySelectorAll("[data-news-id]").forEach((b) =>
    b.addEventListener("click", () => editNews(b.dataset.newsId)),
  );
}
function editNews(id) {
  const x = newsAdmin.find((v) => v.id === id),
    f = document.getElementById("newsForm");
  if (!x || !f) return;
  [
    "id",
    "title",
    "category",
    "external_url",
    "summary",
    "is_featured",
    "is_visible",
  ].forEach((k) => setFormValue(f, k, x[k]));
  setFormValue(f, "published_at", toLocalInput(x.published_at));
  document.getElementById("newsEditorTitle").textContent = x.title;
}
document.getElementById("newNewsBtn")?.addEventListener("click", () => {
  const f = document.getElementById("newsForm");
  resetEditor(f, "newsEditorTitle", "Yeni haber");
  setFormValue(f, "published_at", toLocalInput(new Date().toISOString()));
  setFormValue(f, "is_visible", true);
});
document.getElementById("newsForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const f = e.currentTarget;
  setEditorStatus("newsSaveStatus", "Kaydediliyor…");
  try {
    const payload = {
      title: val(f, "title"),
      summary: val(f, "summary") || null,
      category: val(f, "category") || null,
      published_at: localInputToIso(val(f, "published_at")),
      external_url: val(f, "external_url") || null,
      is_featured: checked(f, "is_featured"),
      is_visible: checked(f, "is_visible"),
      updated_at: new Date().toISOString(),
    };
    const id = val(f, "id"),
      query = id
        ? db.from("news").update(payload).eq("id", id)
        : db.from("news").insert(payload);
    const { error } = await query;
    if (error) throw error;
    setEditorStatus("newsSaveStatus", "Kaydedildi ✓");
    await loadNewsAdmin();
    if (id) editNews(id);
    else resetEditor(f, "newsEditorTitle", "Haber seç");
  } catch (err) {
    setEditorStatus("newsSaveStatus", err.message, true);
  }
});
document
  .getElementById("deleteNewsBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("newsForm"),
      id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu haberi silmek istediğine emin misin?")) return;
    const { error } = await db.from("news").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "newsEditorTitle", "Haber seç");
    await loadNewsAdmin();
  });

// ANNOUNCEMENTS
async function loadAnnouncementsAdmin() {
  const el = document.getElementById("announcementsAdminList");
  if (!el || !db) return;
  emptyManager(el, "Duyurular yükleniyor…");
  const { data, error } = await db
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  announcementsAdmin = data || [];
  renderAnnouncementsAdmin();
}
function renderAnnouncementsAdmin() {
  const el = document.getElementById("announcementsAdminList");
  if (!el) return;
  el.innerHTML =
    announcementsAdmin
      .map(
        (x) =>
          `<button class="manager-item" data-announcement-id="${x.id}"><span class="asset-icon">📣</span><div><strong>${escapeHtml(x.message)}</strong><small>${x.is_active ? "AKTİF" : "PASİF"} · ${x.ends_at ? "BİTİŞ " + shortDate(x.ends_at) : "SÜRESİZ"}</small></div></button>`,
      )
      .join("") || '<div class="empty-state">Henüz duyuru yok.</div>';
  el.querySelectorAll("[data-announcement-id]").forEach((b) =>
    b.addEventListener("click", () =>
      editAnnouncement(b.dataset.announcementId),
    ),
  );
}
function editAnnouncement(id) {
  const x = announcementsAdmin.find((v) => v.id === id),
    f = document.getElementById("announcementForm");
  if (!x || !f) return;
  ["id", "message", "url", "is_active"].forEach((k) =>
    setFormValue(f, k, x[k]),
  );
  setFormValue(f, "starts_at", toLocalInput(x.starts_at));
  setFormValue(f, "ends_at", toLocalInput(x.ends_at));
  document.getElementById("announcementEditorTitle").textContent = "Duyuru";
}
document.getElementById("newAnnouncementBtn")?.addEventListener("click", () => {
  const f = document.getElementById("announcementForm");
  resetEditor(f, "announcementEditorTitle", "Yeni duyuru");
  setFormValue(f, "is_active", true);
});
document
  .getElementById("announcementForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
    const f = e.currentTarget;
    setEditorStatus("announcementSaveStatus", "Kaydediliyor…");
    try {
      const payload = {
        message: val(f, "message"),
        url: val(f, "url") || null,
        starts_at: localInputToIso(val(f, "starts_at")),
        ends_at: localInputToIso(val(f, "ends_at")),
        is_active: checked(f, "is_active"),
        updated_at: new Date().toISOString(),
      };
      const id = val(f, "id"),
        query = id
          ? db.from("announcements").update(payload).eq("id", id)
          : db.from("announcements").insert(payload);
      const { error } = await query;
      if (error) throw error;
      setEditorStatus("announcementSaveStatus", "Kaydedildi ✓");
      await loadAnnouncementsAdmin();
      if (id) editAnnouncement(id);
      else resetEditor(f, "announcementEditorTitle", "Duyuru seç");
    } catch (err) {
      setEditorStatus("announcementSaveStatus", err.message, true);
    }
  });
document
  .getElementById("deleteAnnouncementBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("announcementForm"),
      id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu duyuruyu silmek istediğine emin misin?")) return;
    const { error } = await db.from("announcements").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "announcementEditorTitle", "Duyuru seç");
    await loadAnnouncementsAdmin();
  });

// ===== PHASE 4 · MEDIA, SETTINGS, SOCIALS & AUDIT =====
let mediaAdmin = [];
let socialsAdmin = [];
let auditAdmin = [];
let siteProfileAdmin = {};

async function loadDashboardStats() {
  if (!db) return;
  const now = new Date().toISOString();
  const queries = [
    db
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    db
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("is_visible", true),
    db.from("media_assets").select("*", { count: "exact", head: true }),
    db
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", now)
      .eq("is_visible", true),
  ];
  const [m, v, a, e] = await Promise.all(queries);
  document.getElementById("dashMembers").textContent = m.count ?? "—";
  document.getElementById("dashVideos").textContent = v.count ?? "—";
  document.getElementById("dashMedia").textContent = a.count ?? "—";
  document.getElementById("dashEvents").textContent = e.count ?? "—";
}

function mediaPublicUrl(asset) {
  if (!asset?.bucket || !asset?.path) return "";
  return (
    db.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl || ""
  );
}
function mediaKind(asset) {
  if (asset.kind) return asset.kind;
  if (String(asset.mime_type || "").startsWith("image/")) return "image";
  if (String(asset.mime_type || "").startsWith("audio/")) return "audio";
  return "other";
}
async function loadMediaAdmin() {
  const el = document.getElementById("mediaGrid");
  if (!el || !db) return;
  el.innerHTML = '<div class="empty-state">Medya yükleniyor…</div>';
  const { data, error } = await db
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    el.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    return;
  }
  mediaAdmin = data || [];
  renderMediaAdmin();
}
function renderMediaAdmin() {
  const el = document.getElementById("mediaGrid");
  if (!el) return;
  const filter = document.getElementById("mediaKindFilter")?.value || "all";
  const items =
    filter === "all"
      ? mediaAdmin
      : mediaAdmin.filter((x) => mediaKind(x) === filter);
  document.getElementById("mediaSummary").textContent =
    `${items.length} / ${mediaAdmin.length} dosya`;
  el.innerHTML =
    items
      .map((a) => {
        const kind = mediaKind(a),
          url = mediaPublicUrl(a);
        const preview =
          kind === "image"
            ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(a.alt_text || a.path)}" loading="lazy">`
            : `<span class="media-file-icon">${kind === "audio" ? "♫" : "◫"}</span>`;
        return `<article class="media-card-admin"><div class="media-preview">${preview}</div><div class="media-card-copy"><strong>${escapeHtml(a.alt_text || a.path.split("/").pop())}</strong><small>${escapeHtml(a.path)}</small><div class="media-card-actions"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Aç ↗</a><button data-copy-url="${escapeHtml(url)}">URL kopyala</button><button data-delete-media="${a.id}">Sil</button></div></div></article>`;
      })
      .join("") || '<div class="empty-state">Bu filtrede dosya yok.</div>';
  el.querySelectorAll("[data-copy-url]").forEach((b) =>
    b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.dataset.copyUrl);
      b.textContent = "Kopyalandı ✓";
      setTimeout(() => (b.textContent = "URL kopyala"), 1200);
    }),
  );
  el.querySelectorAll("[data-delete-media]").forEach((b) =>
    b.addEventListener("click", () => deleteMediaAsset(b.dataset.deleteMedia)),
  );
}
async function deleteMediaAsset(id) {
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const a = mediaAdmin.find((x) => x.id === id);
  if (!a) return;
  if (
    !confirm(
      `${a.path} dosyasını Storage ve Media Library'den silmek istediğine emin misin?`,
    )
  )
    return;
  const { error: storageError } = await db.storage
    .from(a.bucket)
    .remove([a.path]);
  if (storageError) return alert(storageError.message);
  const { error } = await db.from("media_assets").delete().eq("id", id);
  if (error) return alert(error.message);
  await Promise.all([loadMediaAdmin(), loadDashboardStats()]);
}
document
  .getElementById("mediaKindFilter")
  ?.addEventListener("change", renderMediaAdmin);
document
  .getElementById("refreshMedia")
  ?.addEventListener("click", loadMediaAdmin);
document
  .getElementById("mediaUploadForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
    const f = e.currentTarget,
      file = f.elements.file.files?.[0];
    setEditorStatus("mediaUploadStatus", "Yükleniyor…");
    try {
      await uploadPublicAssetDetailed(file, val(f, "folder") || "misc", {
        altText: val(f, "alt_text") || null,
      });
      f.reset();
      setEditorStatus("mediaUploadStatus", "Yüklendi ✓");
      await Promise.all([loadMediaAdmin(), loadDashboardStats()]);
    } catch (err) {
      setEditorStatus("mediaUploadStatus", err.message, true);
    }
  });

async function loadSiteSettingsAdmin() {
  const f = document.getElementById("siteSettingsForm");
  if (!f || !db) return;
  const { data, error } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "site_profile")
    .maybeSingle();
  if (error) {
    setEditorStatus("siteSettingsStatus", error.message, true);
    return;
  }
  siteProfileAdmin = data?.value || {};
  Object.keys(siteProfileAdmin).forEach((k) =>
    setFormValue(f, k, siteProfileAdmin[k]),
  );
}
document
  .getElementById("siteSettingsForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
    const f = e.currentTarget;
    setEditorStatus("siteSettingsStatus", "Kaydediliyor…");
    try {
      let groupPhoto = val(f, "group_photo_url");
      const file = f.elements.group_photo_file.files?.[0];
      if (file) {
        const uploaded = await uploadPublicAssetDetailed(file, "posters", {
          altText: "CRUSH grup fotoğrafı",
        });
        groupPhoto = uploaded?.url || groupPhoto;
        setFormValue(f, "group_photo_url", groupPhoto);
      }
      const keys = [
        "site_title",
        "hero_kicker",
        "hero_primary",
        "hero_secondary",
        "story_kicker",
        "story_title_line1",
        "story_title_em",
        "story_paragraph_1",
        "story_paragraph_2",
        "story_paragraph_3",
        "footer_text",
      ];
      const value = {};
      keys.forEach((k) => (value[k] = val(f, k)));
      value.group_photo_url = groupPhoto;
      const user = (await db.auth.getUser()).data.user;
      const { error } = await db
        .from("site_settings")
        .upsert(
          {
            key: "site_profile",
            value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null,
          },
          { onConflict: "key" },
        );
      if (error) throw error;
      siteProfileAdmin = value;
      setEditorStatus("siteSettingsStatus", "Kaydedildi ✓");
      await Promise.all([loadMediaAdmin(), loadAuditLogs()]);
    } catch (err) {
      setEditorStatus("siteSettingsStatus", err.message, true);
    }
  });

async function loadSocialsAdmin() {
  const el = document.getElementById("socialsAdminList");
  if (!el || !db) return;
  emptyManager(el, "Sosyal hesaplar yükleniyor…");
  const { data, error } = await db
    .from("social_links")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    emptyManager(el, error.message);
    return;
  }
  socialsAdmin = data || [];
  renderSocialsAdmin();
}
function renderSocialsAdmin() {
  const el = document.getElementById("socialsAdminList");
  if (!el) return;
  el.innerHTML =
    socialsAdmin
      .map(
        (x) =>
          `<button class="manager-item" data-social-id="${x.id}"><span class="asset-icon">@</span><div><strong>${escapeHtml(x.platform)}</strong><small>#${x.display_order} · ${escapeHtml(x.label || "")} · ${x.is_active ? "AKTİF" : "GİZLİ"}</small></div></button>`,
      )
      .join("") || '<div class="empty-state">Henüz hesap yok.</div>';
  el.querySelectorAll("[data-social-id]").forEach((b) =>
    b.addEventListener("click", () => editSocial(b.dataset.socialId)),
  );
}
function editSocial(id) {
  const x = socialsAdmin.find((v) => v.id === id),
    f = document.getElementById("socialForm");
  if (!x || !f) return;
  ["id", "platform", "label", "url", "display_order", "is_active"].forEach(
    (k) => setFormValue(f, k, x[k]),
  );
  document.getElementById("socialEditorTitle").textContent = x.platform;
}
document.getElementById("newSocialBtn")?.addEventListener("click", () => {
  const f = document.getElementById("socialForm");
  resetEditor(f, "socialEditorTitle", "Yeni sosyal hesap");
  setFormValue(f, "display_order", socialsAdmin.length + 1);
  setFormValue(f, "is_active", true);
});
document.getElementById("socialForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!canEditContent()) return alert("Bu hesap içerik düzenleyemez.");
  const f = e.currentTarget;
  setEditorStatus("socialSaveStatus", "Kaydediliyor…");
  try {
    const payload = {
      platform: val(f, "platform").toLowerCase(),
      label: val(f, "label") || null,
      url: val(f, "url"),
      display_order: Number(val(f, "display_order") || 0),
      is_active: checked(f, "is_active"),
      updated_at: new Date().toISOString(),
    };
    const id = val(f, "id"),
      q = id
        ? db.from("social_links").update(payload).eq("id", id)
        : db.from("social_links").insert(payload);
    const { error } = await q;
    if (error) throw error;
    setEditorStatus("socialSaveStatus", "Kaydedildi ✓");
    await Promise.all([loadSocialsAdmin(), loadAuditLogs()]);
    if (id) editSocial(id);
    else resetEditor(f, "socialEditorTitle", "Hesap seç");
  } catch (err) {
    setEditorStatus("socialSaveStatus", err.message, true);
  }
});
document
  .getElementById("deleteSocialBtn")
  ?.addEventListener("click", async () => {
    const f = document.getElementById("socialForm"),
      id = val(f, "id");
    if (!id || !canEditContent()) return;
    if (!confirm("Bu sosyal hesabı silmek istediğine emin misin?")) return;
    const { error } = await db.from("social_links").delete().eq("id", id);
    if (error) return alert(error.message);
    resetEditor(f, "socialEditorTitle", "Hesap seç");
    await Promise.all([loadSocialsAdmin(), loadAuditLogs()]);
  });

async function loadAuditLogs() {
  const el = document.getElementById("auditList");
  if (!el || !db) return;
  el.innerHTML = '<div class="empty-state">Kayıtlar yükleniyor…</div>';
  const [{ data, error }, { data: profiles }] = await Promise.all([
    db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250),
    db.from("admin_profiles").select("id,display_name"),
  ]);
  if (error) {
    el.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    return;
  }
  const names = Object.fromEntries(
    (profiles || []).map((x) => [x.id, x.display_name || "Admin"]),
  );
  auditAdmin = (data || []).map((x) => ({
    ...x,
    admin_name: names[x.admin_id] || "System",
  }));
  renderAuditLogs();
}
function renderAuditLogs() {
  const el = document.getElementById("auditList");
  if (!el) return;
  const filter = document.getElementById("auditEntityFilter")?.value || "all";
  const rows =
    filter === "all"
      ? auditAdmin
      : auditAdmin.filter((x) => x.entity_type === filter);
  el.innerHTML =
    rows
      .map(
        (x) =>
          `<div class="audit-row"><span class="audit-action">${escapeHtml(x.action)}</span><span class="audit-entity">${escapeHtml(x.entity_type || "—")}</span><p><strong>${escapeHtml(x.admin_name)}</strong> · ${escapeHtml(x.entity_id || "")}</p><time>${fmtDate(x.created_at)}</time></div>`,
      )
      .join("") ||
    '<div class="empty-state">Henüz audit kaydı yok. Phase 4 sonrasındaki değişiklikler burada görünür.</div>';
  const recent = document.getElementById("recentAudit");
  if (recent)
    recent.innerHTML =
      auditAdmin
        .slice(0, 6)
        .map(
          (x) =>
            `<div class="recent-item"><div><strong>${escapeHtml(x.admin_name)} · ${escapeHtml(x.action.toUpperCase())}</strong><p>${escapeHtml(x.entity_type || "")} · ${escapeHtml(x.entity_id || "")}</p></div><time>${shortDate(x.created_at)}</time></div>`,
        )
        .join("") ||
      '<div class="empty-state">Henüz yönetim hareketi yok.</div>';
}
document
  .getElementById("auditEntityFilter")
  ?.addEventListener("change", renderAuditLogs);
document
  .getElementById("refreshAudit")
  ?.addEventListener("click", loadAuditLogs);

// ===== PHASE 4.1 · PRIVACY-FRIENDLY ANALYTICS =====
let analyticsDaily = [];
const formatCount = (n) =>
  new Intl.NumberFormat("tr-TR").format(Number(n || 0));
function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds || 0)));
  if (!s) return "—";
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60),
    r = s % 60;
  return r ? `${m} dk ${r} sn` : `${m} dk`;
}
function analyticsDateLabel(value) {
  const d = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}
function renderAnalyticsChart(rows) {
  const el = document.getElementById("analyticsChart");
  if (!el) return;
  if (!rows?.length) {
    el.innerHTML = '<div class="empty-state">Henüz ziyaret verisi yok.</div>';
    return;
  }
  const width = 920,
    height = 300,
    padL = 48,
    padR = 18,
    padT = 22,
    padB = 44;
  const max = Math.max(1, ...rows.map((x) => Number(x.visits || 0)));
  const innerW = width - padL - padR,
    innerH = height - padT - padB;
  const x = (i) =>
    padL + (rows.length === 1 ? innerW / 2 : (i * innerW) / (rows.length - 1));
  const y = (v) => padT + innerH - (Number(v || 0) / max) * innerH;
  const points = rows
    .map((r, i) => `${x(i).toFixed(1)},${y(r.visits).toFixed(1)}`)
    .join(" ");
  const area = `${padL},${padT + innerH} ${points} ${x(rows.length - 1)},${padT + innerH}`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const yGrid = ticks
    .map(
      (v) =>
        `<line class="analytics-grid-line" x1="${padL}" y1="${y(v)}" x2="${width - padR}" y2="${y(v)}"/><text class="analytics-axis-label" x="${padL - 10}" y="${y(v) + 4}" text-anchor="end">${v}</text>`,
    )
    .join("");
  const step = Math.max(1, Math.ceil(rows.length / 7));
  const xLabels = rows
    .map((r, i) =>
      i % step === 0 || i === rows.length - 1
        ? `<text class="analytics-axis-label" x="${x(i)}" y="${height - 14}" text-anchor="middle">${analyticsDateLabel(r.day)}</text>`
        : "",
    )
    .join("");
  const dots = rows
    .map(
      (r, i) =>
        `<circle class="analytics-dot" cx="${x(i)}" cy="${y(r.visits)}" r="4"><title>${analyticsDateLabel(r.day)}: ${r.visits} ziyaret · ${r.unique_visitors} tekil</title></circle>`,
    )
    .join("");
  el.innerHTML = `<div class="analytics-chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Günlük ziyaret grafiği">${yGrid}<polygon class="analytics-area" points="${area}"/><polyline class="analytics-line" points="${points}"/>${dots}${xLabels}</svg><div class="analytics-chart-summary"><span>En yüksek: ${formatCount(max)}</span><span>${formatCount(rows.reduce((a, x) => a + Number(x.visits || 0), 0))} toplam ziyaret</span></div></div>`;
}
function renderAnalyticsBreakdown(id, rows, labelKey = "label") {
  const el = document.getElementById(id);
  if (!el) return;
  const max = Math.max(1, ...(rows || []).map((x) => Number(x.visits || 0)));
  el.innerHTML =
    (rows || [])
      .map(
        (x) =>
          `<div class="analytics-breakdown-row"><strong title="${escapeHtml(x[labelKey] || "—")}">${escapeHtml(x[labelKey] || "—")}</strong><div class="analytics-breakdown-bar"><i style="--w:${Math.max(2, (Number(x.visits || 0) / max) * 100)}%"></i></div><span>${formatCount(x.visits)}</span></div>`,
      )
      .join("") || '<div class="empty-state">Henüz veri yok.</div>';
}
function renderAnalyticsTable(rows) {
  const body = document.getElementById("analyticsDailyRows");
  if (!body) return;
  body.innerHTML =
    [...(rows || [])]
      .reverse()
      .map(
        (r) =>
          `<tr><td>${analyticsDateLabel(r.day)}</td><td>${formatCount(r.visits)}</td><td>${formatCount(r.unique_visitors)}</td><td>${formatDuration(r.avg_duration_seconds)}</td></tr>`,
      )
      .join("") || '<tr><td colspan="4">Henüz veri yok.</td></tr>';
}
async function loadAnalytics() {
  if (!db) return;
  const range = Math.max(
    7,
    Math.min(
      90,
      Number(document.getElementById("analyticsRange")?.value || 30),
    ),
  );
  const chart = document.getElementById("analyticsChart");
  if (chart)
    chart.innerHTML =
      '<div class="empty-state">Analitik verisi yükleniyor…</div>';
  const [overview, daily, pages, devices] = await Promise.all([
    db.rpc("crush_analytics_overview"),
    db.rpc("crush_analytics_daily", { p_days: range }),
    db.rpc("crush_analytics_top_pages", { p_days: range, p_limit: 8 }),
    db.rpc("crush_analytics_devices", { p_days: range }),
  ]);
  const err = overview.error || daily.error || pages.error || devices.error;
  if (err) {
    if (chart)
      chart.innerHTML = `<div class="error-state">${escapeHtml(err.message)}</div>`;
    return;
  }
  const o = Array.isArray(overview.data) ? overview.data[0] : overview.data;
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("analyticsToday", formatCount(o?.today_visits));
  set("analyticsYesterday", formatCount(o?.yesterday_visits));
  set("analytics7", formatCount(o?.last7_visits));
  set("analytics30", formatCount(o?.last30_visits));
  set("analyticsTotal", formatCount(o?.total_visits));
  set("analyticsUnique", formatCount(o?.total_unique_visitors));
  set("analyticsTodayUnique", formatCount(o?.today_unique_visitors));
  set("analyticsAvgDuration", formatDuration(o?.avg_duration_seconds));
  set("dashTodayVisits", formatCount(o?.today_visits));
  set("dashTotalVisits", formatCount(o?.total_visits));
  analyticsDaily = daily.data || [];
  renderAnalyticsChart(analyticsDaily);
  renderAnalyticsTable(analyticsDaily);
  renderAnalyticsBreakdown("analyticsPages", pages.data || [], "path");
  renderAnalyticsBreakdown(
    "analyticsDevices",
    devices.data || [],
    "device_type",
  );
  const caption = document.getElementById("analyticsChartCaption");
  if (caption) caption.textContent = `Son ${range} gün`;
}
document
  .getElementById("analyticsRange")
  ?.addEventListener("change", loadAnalytics);
document
  .getElementById("analyticsRefreshBtn")
  ?.addEventListener("click", loadAnalytics);

requireAdmin();
