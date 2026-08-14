const db = window.crushSupabase;
const ready = window.CRUSH_DB_READY;
const loginPanel = document.getElementById('loginPanel');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const lettersList = document.getElementById('lettersList');
const letterDetail = document.getElementById('letterDetail');
let letters = [];
let currentFilter = 'all';
let activeLetterId = null;
let adminProfile = null;

const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate = value => value ? new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';
const shortDate = value => value ? new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short'}).format(new Date(value)) : '—';

function showLogin(message=''){
  loginPanel.hidden = false; dashboard.hidden = true; loginStatus.textContent = message;
}
function showDashboard(){loginPanel.hidden=true;dashboard.hidden=false;}

async function requireAdmin(){
  if(!ready || !db){ showLogin('Supabase bağlantısı henüz yapılandırılmamış.'); return false; }
  const {data:{user}} = await db.auth.getUser();
  if(!user){showLogin();return false;}
  const {data:profile,error} = await db.from('admin_profiles').select('display_name,role,is_active').eq('id',user.id).single();
  if(error || !profile?.is_active){await db.auth.signOut();showLogin('Bu hesap admin yetkisine sahip değil.');return false;}
  adminProfile=profile;
  document.getElementById('adminName').textContent=profile.display_name || user.email;
  document.getElementById('adminRole').textContent=profile.role.toUpperCase();
  showDashboard(); await Promise.all([loadLetters(), loadMembersAdmin(), loadVideosAdmin(), loadMusicAdmin()]); return true;
}

loginForm?.addEventListener('submit',async e=>{
  e.preventDefault(); loginStatus.textContent='Giriş yapılıyor…';
  if(!ready || !db){loginStatus.textContent='Önce js/supabase-config.js dosyasını doldur.';return;}
  const form=new FormData(loginForm);
  const {error}=await db.auth.signInWithPassword({email:String(form.get('email')).trim(),password:String(form.get('password'))});
  if(error){loginStatus.textContent='Giriş başarısız: '+error.message;return;}
  await requireAdmin();
});

document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await db?.auth.signOut();showLogin();});

async function loadLetters(){
  lettersList.innerHTML='<div class="empty-state">Mektuplar yükleniyor…</div>';
  const {data,error}=await db.from('letters').select('*').order('submitted_at',{ascending:false}).limit(250);
  if(error){lettersList.innerHTML=`<div class="error-state">${escapeHtml(error.message)}</div>`;return;}
  letters=data||[]; renderOverview(); renderLetters();
}

function renderOverview(){
  const unread=letters.filter(x=>x.status==='unread').length;
  const favorites=letters.filter(x=>x.is_favorite || x.status==='favorite').length;
  document.getElementById('totalLetters').textContent=letters.length;
  document.getElementById('newLetters').textContent=unread;
  document.getElementById('favoriteLetters').textContent=favorites;
  document.getElementById('lastLetter').textContent=letters[0]?shortDate(letters[0].submitted_at):'—';
  document.getElementById('unreadBadge').textContent=unread;
  document.getElementById('recentLetters').innerHTML=letters.slice(0,6).map(l=>`<div class="recent-item" data-id="${l.id}"><div><strong>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</strong><p>${escapeHtml(l.message)}</p></div><time>${shortDate(l.submitted_at)}</time></div>`).join('') || '<div class="empty-state">Henüz mektup yok.</div>';
  document.querySelectorAll('.recent-item').forEach(el=>el.addEventListener('click',()=>openLetterView(el.dataset.id)));
}

function filteredLetters(){
  if(currentFilter==='all')return letters;
  if(currentFilter==='favorite')return letters.filter(x=>x.is_favorite||x.status==='favorite');
  return letters.filter(x=>x.status===currentFilter);
}
function renderLetters(){
  const list=filteredLetters();
  lettersList.innerHTML=list.map(l=>`<div class="letter-row ${l.status==='unread'?'unread':''} ${l.id===activeLetterId?'active':''}" data-id="${l.id}"><div class="letter-row-top"><h3>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)} ${l.is_favorite?'★':''}</h3><time>${shortDate(l.submitted_at)}</time></div><p>${escapeHtml(l.message)}</p></div>`).join('') || '<div class="empty-state">Bu filtrede mektup yok.</div>';
  document.querySelectorAll('.letter-row').forEach(el=>el.addEventListener('click',()=>selectLetter(el.dataset.id)));
}

async function drawingUrl(path){
  if(!path)return null;
  const {data,error}=await db.storage.from('fan-letters').createSignedUrl(path,300);
  return error?null:data.signedUrl;
}

async function selectLetter(id){
  activeLetterId=id; renderLetters();
  const l=letters.find(x=>x.id===id); if(!l)return;
  if(l.status==='unread' && ['owner','editor'].includes(adminProfile?.role)){
    const {error}=await db.from('letters').update({status:'read',read_at:new Date().toISOString()}).eq('id',id);
    if(!error){l.status='read';renderOverview();renderLetters();}
  }
  const img=await drawingUrl(l.drawing_path);
  letterDetail.className='letter-detail';
  letterDetail.innerHTML=`<div class="letter-paper-admin" data-theme="${l.letter_theme}"><h2>Dear CRUSH ♡</h2><div class="message">${escapeHtml(l.message)}</div>${img?`<img class="letter-drawing" src="${escapeHtml(img)}" alt="Gönderenin çizimi" />`:''}</div><div class="letter-meta"><div class="letter-meta-grid"><div class="meta-chip"><small>GÖNDEREN</small>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</div><div class="meta-chip"><small>E-POSTA</small>${escapeHtml(l.email)}</div><div class="meta-chip"><small>TARİH</small>${fmtDate(l.submitted_at)}</div><div class="meta-chip"><small>KAĞIT STİLİ</small>${l.letter_theme}</div></div><div class="letter-actions-admin"><button class="primary" data-action="favorite">${l.is_favorite?'★ Favoriden çıkar':'☆ Favori'}</button><button data-action="archive">Arşivle</button><button data-action="read">Okundu</button></div></div>`;
  letterDetail.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>updateLetter(l,btn.dataset.action)));
}

async function updateLetter(letter,action){
  if(!['owner','editor'].includes(adminProfile?.role))return;
  const patch={};
  if(action==='favorite'){patch.is_favorite=!letter.is_favorite;patch.status=patch.is_favorite?'favorite':'read';}
  if(action==='archive'){patch.status='archived';patch.archived_at=new Date().toISOString();}
  if(action==='read'){patch.status='read';patch.read_at=letter.read_at||new Date().toISOString();}
  const {error}=await db.from('letters').update(patch).eq('id',letter.id);
  if(error){alert(error.message);return;}
  Object.assign(letter,patch);renderOverview();renderLetters();await selectLetter(letter.id);
}

function setView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(`view-${name}`)?.classList.add('active');
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={overview:'Dashboard',letters:'Fan Letters',members:'Members',videos:'Videos',music:'Music'};
  document.getElementById('viewTitle').textContent=titles[name]||name;
}
function openLetterView(id){setView('letters');selectLetter(id);}
document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.getElementById('openAllLetters')?.addEventListener('click',()=>setView('letters'));
document.getElementById('refreshLetters')?.addEventListener('click',loadLetters);
document.querySelectorAll('#letterFilters [data-filter]').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;document.querySelectorAll('#letterFilters [data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLetters();}));


// ===== PHASE 2 · CONTENT MANAGEMENT =====
let membersAdmin = [];
let videosAdmin = [];
let musicAdmin = [];
const canEditContent = () => ['owner','editor'].includes(adminProfile?.role);

function slugify(value=''){
  return String(value).toLocaleLowerCase('tr-TR')
    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function youtubeId(value=''){
  const v=String(value).trim();
  if(/^[\w-]{11}$/.test(v)) return v;
  try{
    const url=new URL(v);
    if(url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0]||'';
    if(url.searchParams.get('v')) return url.searchParams.get('v');
    const parts=url.pathname.split('/').filter(Boolean);
    const marker=parts.findIndex(x=>['embed','shorts','live'].includes(x));
    if(marker>=0 && parts[marker+1]) return parts[marker+1];
  }catch{}
  return '';
}
function val(form,name){return String(form.elements[name]?.value||'').trim();}
function checked(form,name){return Boolean(form.elements[name]?.checked);}
function setFormValue(form,name,value){
  const el=form.elements[name]; if(!el) return;
  if(el.type==='checkbox') el.checked=Boolean(value);
  else el.value=value??'';
}
function setEditorStatus(id,text='',isError=false){
  const el=document.getElementById(id); if(!el)return;
  el.textContent=text; el.classList.toggle('error',isError);
}
async function uploadPublicAsset(file,folder){
  if(!file || !file.size) return null;
  if(file.size > 6 * 1024 * 1024) throw new Error('Bu sürümde panelden yüklenen dosya en fazla 6 MB olabilir.');
  const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from('crush-public').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
  if(error) throw error;
  return db.storage.from('crush-public').getPublicUrl(path).data.publicUrl;
}
function emptyManager(el,text){if(el)el.innerHTML=`<div class="empty-state">${escapeHtml(text)}</div>`;}
function resetEditor(form,titleId,title){
  form?.reset();
  setFormValue(form,'id','');
  document.getElementById(titleId).textContent=title;
}

// MEMBERS
async function loadMembersAdmin(){
  const el=document.getElementById('membersAdminList'); if(!el||!db)return;
  emptyManager(el,'Üyeler yükleniyor…');
  const {data,error}=await db.from('members').select('*').order('display_order',{ascending:true});
  if(error){emptyManager(el,error.message);return;}
  membersAdmin=data||[]; renderMembersAdmin();
}
function renderMembersAdmin(){
  const el=document.getElementById('membersAdminList'); if(!el)return;
  el.innerHTML=membersAdmin.map(m=>`<button class="manager-item" data-member-id="${m.id}">
    <span class="asset-dot"></span>
    <div><strong>${escapeHtml(m.display_name)}</strong><small>#${m.display_order} · ${m.is_active?'AKTİF':'GİZLİ'}</small></div>
  </button>`).join('')||'<div class="empty-state">Henüz üye yok.</div>';
  el.querySelectorAll('[data-member-id]').forEach(b=>b.addEventListener('click',()=>editMember(b.dataset.memberId)));
}
function editMember(id){
  const m=membersAdmin.find(x=>x.id===id); const f=document.getElementById('memberForm'); if(!m||!f)return;
  ['id','display_name','slug','first_name','last_name','display_order','accent_color','bio','photo_url','instagram_url','x_url','tiktok_url','is_active']
    .forEach(k=>setFormValue(f,k,m[k]));
  setFormValue(f,'tags',(m.tags||[]).join(', '));
  document.getElementById('memberEditorTitle').textContent=m.display_name;
}
document.getElementById('newMemberBtn')?.addEventListener('click',()=>{
  const f=document.getElementById('memberForm'); resetEditor(f,'memberEditorTitle','Yeni üye');
  setFormValue(f,'display_order',membersAdmin.length+1); setFormValue(f,'accent_color','#ff7398'); setFormValue(f,'is_active',true);
});
document.getElementById('memberForm')?.elements?.display_name?.addEventListener('input',e=>{
  const f=document.getElementById('memberForm');
  if(!val(f,'id') && !val(f,'slug')) setFormValue(f,'slug',slugify(e.target.value));
});
document.getElementById('memberForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); if(!canEditContent()) return alert('Bu hesap içerik düzenleyemez.');
  const f=e.currentTarget; setEditorStatus('memberSaveStatus','Kaydediliyor…');
  try{
    let photo=val(f,'photo_url');
    const file=f.elements.photo_file.files?.[0];
    if(file) photo=await uploadPublicAsset(file,'members');
    const payload={
      slug:val(f,'slug')||slugify(val(f,'display_name')),
      display_name:val(f,'display_name'), first_name:val(f,'first_name'), last_name:val(f,'last_name')||null,
      display_order:Number(val(f,'display_order')||0), accent_color:val(f,'accent_color')||'#ff7398',
      bio:val(f,'bio')||null, tags:val(f,'tags').split(',').map(x=>x.trim()).filter(Boolean),
      photo_url:photo||null, thumbnail_url:photo||null,
      instagram_url:val(f,'instagram_url')||null, x_url:val(f,'x_url')||null, tiktok_url:val(f,'tiktok_url')||null,
      is_active:checked(f,'is_active'), updated_at:new Date().toISOString()
    };
    const id=val(f,'id');
    const query=id?db.from('members').update(payload).eq('id',id):db.from('members').insert(payload);
    const {error}=await query; if(error)throw error;
    setEditorStatus('memberSaveStatus','Kaydedildi ✓'); await loadMembersAdmin();
    if(id) editMember(id); else resetEditor(f,'memberEditorTitle','Üye seç');
  }catch(err){setEditorStatus('memberSaveStatus',err.message,true);}
});
document.getElementById('deleteMemberBtn')?.addEventListener('click',async()=>{
  const f=document.getElementById('memberForm'); const id=val(f,'id'); if(!id||!canEditContent())return;
  if(!confirm('Bu üyeyi silmek istediğine emin misin?'))return;
  const {error}=await db.from('members').delete().eq('id',id); if(error)return alert(error.message);
  resetEditor(f,'memberEditorTitle','Üye seç'); await loadMembersAdmin();
});

// VIDEOS
async function loadVideosAdmin(){
  const el=document.getElementById('videosAdminList'); if(!el||!db)return;
  emptyManager(el,'Videolar yükleniyor…');
  const {data,error}=await db.from('videos').select('*').order('display_order',{ascending:true});
  if(error){emptyManager(el,error.message);return;}
  videosAdmin=data||[]; renderVideosAdmin();
}
function renderVideosAdmin(){
  const el=document.getElementById('videosAdminList'); if(!el)return;
  el.innerHTML=videosAdmin.map(v=>`<button class="manager-item" data-video-id="${v.id}">
    <span class="asset-icon">▶</span><div><strong>${escapeHtml(v.title)}</strong><small>${escapeHtml(v.section)} · #${v.display_order} · ${v.is_visible?'AKTİF':'GİZLİ'}</small></div>
  </button>`).join('')||'<div class="empty-state">Henüz video yok.</div>';
  el.querySelectorAll('[data-video-id]').forEach(b=>b.addEventListener('click',()=>editVideo(b.dataset.videoId)));
}
function editVideo(id){
  const v=videosAdmin.find(x=>x.id===id); const f=document.getElementById('videoForm'); if(!v||!f)return;
  ['id','title','category','badge','section','display_order','description','thumbnail_url','is_visible','is_featured'].forEach(k=>setFormValue(f,k,v[k]));
  setFormValue(f,'youtube',v.youtube_id||'');
  document.getElementById('videoEditorTitle').textContent=v.title;
}
document.getElementById('newVideoBtn')?.addEventListener('click',()=>{
  const f=document.getElementById('videoForm'); resetEditor(f,'videoEditorTitle','Yeni video');
  setFormValue(f,'display_order',videosAdmin.length+1); setFormValue(f,'section','archive'); setFormValue(f,'is_visible',true);
});
document.getElementById('videoForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); if(!canEditContent())return alert('Bu hesap içerik düzenleyemez.');
  const f=e.currentTarget; setEditorStatus('videoSaveStatus','Kaydediliyor…');
  try{
    const yt=youtubeId(val(f,'youtube')); if(!yt)throw new Error('Geçerli bir YouTube URL veya video ID gir.');
    const payload={title:val(f,'title'),youtube_id:yt,description:val(f,'description')||null,category:val(f,'category')||null,
      badge:val(f,'badge')||null,thumbnail_url:val(f,'thumbnail_url')||`https://img.youtube.com/vi/${yt}/maxresdefault.jpg`,
      display_order:Number(val(f,'display_order')||0),section:val(f,'section')||'archive',
      is_featured:checked(f,'is_featured'),is_visible:checked(f,'is_visible'),updated_at:new Date().toISOString()};
    const id=val(f,'id');
    const query=id?db.from('videos').update(payload).eq('id',id):db.from('videos').insert(payload);
    const {error}=await query; if(error)throw error;
    setEditorStatus('videoSaveStatus','Kaydedildi ✓'); await loadVideosAdmin();
    if(id) editVideo(id); else resetEditor(f,'videoEditorTitle','Video seç');
  }catch(err){setEditorStatus('videoSaveStatus',err.message,true);}
});
document.getElementById('deleteVideoBtn')?.addEventListener('click',async()=>{
  const f=document.getElementById('videoForm');const id=val(f,'id');if(!id||!canEditContent())return;
  if(!confirm('Bu videoyu silmek istediğine emin misin?'))return;
  const {error}=await db.from('videos').delete().eq('id',id);if(error)return alert(error.message);
  resetEditor(f,'videoEditorTitle','Video seç');await loadVideosAdmin();
});

// MUSIC
async function loadMusicAdmin(){
  const el=document.getElementById('musicAdminList');if(!el||!db)return;
  emptyManager(el,'Müzikler yükleniyor…');
  const {data,error}=await db.from('music_tracks').select('*').order('display_order',{ascending:true});
  if(error){emptyManager(el,error.message);return;}
  musicAdmin=data||[];renderMusicAdmin();
}
function renderMusicAdmin(){
  const el=document.getElementById('musicAdminList');if(!el)return;
  el.innerHTML=musicAdmin.map(t=>`<button class="manager-item" data-music-id="${t.id}">
    <span class="asset-icon">♫</span><div><strong>${escapeHtml(t.title)}</strong><small>${t.is_featured?'PIKAP · ':''}#${t.display_order} · ${t.is_active?'AKTİF':'GİZLİ'}</small></div>
  </button>`).join('')||'<div class="empty-state">Henüz parça yok.</div>';
  el.querySelectorAll('[data-music-id]').forEach(b=>b.addEventListener('click',()=>editMusic(b.dataset.musicId)));
}
function editMusic(id){
  const t=musicAdmin.find(x=>x.id===id);const f=document.getElementById('musicForm');if(!t||!f)return;
  ['id','title','subtitle','release_date','display_order','cover_url','audio_url','youtube_url','spotify_url','apple_music_url','is_featured','is_active']
    .forEach(k=>setFormValue(f,k,t[k]));
  document.getElementById('musicEditorTitle').textContent=t.title;
}
document.getElementById('newMusicBtn')?.addEventListener('click',()=>{
  const f=document.getElementById('musicForm');resetEditor(f,'musicEditorTitle','Yeni parça');
  setFormValue(f,'subtitle','CRUSH');setFormValue(f,'display_order',musicAdmin.length+1);setFormValue(f,'is_active',true);
});
document.getElementById('musicForm')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!canEditContent())return alert('Bu hesap içerik düzenleyemez.');
  const f=e.currentTarget;setEditorStatus('musicSaveStatus','Kaydediliyor…');
  try{
    let cover=val(f,'cover_url'), audio=val(f,'audio_url');
    const coverFile=f.elements.cover_file.files?.[0], audioFile=f.elements.audio_file.files?.[0];
    if(coverFile)cover=await uploadPublicAsset(coverFile,'covers');
    if(audioFile)audio=await uploadPublicAsset(audioFile,'music');
    const featured=checked(f,'is_featured');
    if(featured){
      const {error:clearError}=await db.from('music_tracks').update({is_featured:false,updated_at:new Date().toISOString()}).eq('is_featured',true);
      if(clearError)throw clearError;
    }
    const payload={title:val(f,'title'),subtitle:val(f,'subtitle')||null,release_date:val(f,'release_date')||null,
      display_order:Number(val(f,'display_order')||0),cover_url:cover||null,audio_url:audio||null,
      youtube_url:val(f,'youtube_url')||null,spotify_url:val(f,'spotify_url')||null,apple_music_url:val(f,'apple_music_url')||null,
      is_featured:featured,is_active:checked(f,'is_active'),updated_at:new Date().toISOString()};
    const id=val(f,'id');const query=id?db.from('music_tracks').update(payload).eq('id',id):db.from('music_tracks').insert(payload);
    const {error}=await query;if(error)throw error;
    setEditorStatus('musicSaveStatus','Kaydedildi ✓');await loadMusicAdmin();
    if(id)editMusic(id);else resetEditor(f,'musicEditorTitle','Parça seç');
  }catch(err){setEditorStatus('musicSaveStatus',err.message,true);}
});
document.getElementById('deleteMusicBtn')?.addEventListener('click',async()=>{
  const f=document.getElementById('musicForm');const id=val(f,'id');if(!id||!canEditContent())return;
  if(!confirm('Bu parçayı silmek istediğine emin misin?'))return;
  const {error}=await db.from('music_tracks').delete().eq('id',id);if(error)return alert(error.message);
  resetEditor(f,'musicEditorTitle','Parça seç');await loadMusicAdmin();
});

requireAdmin();
