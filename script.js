/**
 * متحف ميمي الفني - Mimi's Art Museum Script
 * Supabase Edition: Cloud Storage, Database & Real-time sync.
 * الصور تُرفع على Supabase Storage والبيانات على Supabase Database.
 */

// ==========================================
// 0. Supabase Configuration
// ==========================================
const SUPABASE_URL  = 'https://rhvyuzbefvqbesjhkdam.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJodnl1emJlZnZxYmVzamhrZGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzIyNzgsImV4cCI6MjEwNTc0ODI3OH0.WYeR0PYLeECv_repOTRv5lmnocjwfWTewgsM395x-8s';
const STORAGE_BUCKET = 'mimi-art';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 1. Authentication & Artist Protection
// ==========================================
function isArtistAuthenticated() {
  return sessionStorage.getItem('mimi_authenticated') === 'true';
}

function updateAuthUI() {
  const isAuth = isArtistAuthenticated();
  const authBtn = document.getElementById('artistAuthNavBtn');

  if (isAuth) {
    document.body.classList.add('artist-mode');
    if (authBtn) {
      authBtn.innerHTML = `👑 ميمي | <span style="text-decoration: underline;">خروج</span>`;
      authBtn.title = 'انقري لتسجيل الخروج أو قفل المعرض';
      authBtn.style.borderColor = 'var(--gold)';
      authBtn.style.background = 'rgba(201, 162, 39, 0.2)';
    }
  } else {
    document.body.classList.remove('artist-mode');
    if (authBtn) {
      authBtn.innerHTML = `🔒 دخول ميمي`;
      authBtn.title = 'دخول الفنانة ميمي لإضافة الرسومات والصور';
      authBtn.style.borderColor = 'rgba(201,162,39,0.4)';
      authBtn.style.background = 'rgba(255,255,255,0.1)';
    }
  }

  renderDrawings();
  renderLife();
}

function handleAuthButtonClick() {
  if (isArtistAuthenticated()) {
    if (confirm('أهلاً ميمي، هل تودين قفل المتحف وتسجيل الخروج؟')) {
      sessionStorage.removeItem('mimi_authenticated');
      updateAuthUI();
      showToast('تم قفل المتحف والعودة لوضع الزائر 🔒');
    }
  } else {
    openAuthModal();
  }
}

function openAuthModal() {
  closeModals();
  const modal = document.getElementById('authModal');
  const input = document.getElementById('artistPasswordInput');
  const errorMsg = document.getElementById('authErrorMessage');
  if (errorMsg) errorMsg.style.display = 'none';
  if (input) input.value = '';
  modal.classList.add('open');
  setTimeout(() => { if (input) input.focus(); }, 200);
}

function verifyArtistPassword() {
  const input = document.getElementById('artistPasswordInput');
  const errorMsg = document.getElementById('authErrorMessage');
  const enteredPass = input ? input.value.trim() : '';

  if (enteredPass === 'mimi2026') {
    sessionStorage.setItem('mimi_authenticated', 'true');
    closeModals();
    updateAuthUI();
    showToast('أهلاً وسهلاً بكِ يا ميمي! تم تفعيل وضع الفنانة بنجاح 🎨👑');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    if (input) {
      input.style.borderColor = '#dc2626';
      input.focus();
      input.select();
    }
    showToast('رمز المرور غير صحيح!', 'error');
  }
}

// ==========================================
// 2. Data Cache & Loading from Supabase
// ==========================================
let drawingsCache = [];
let lifeCache = [];

async function loadDrawings() {
  try {
    const { data, error } = await db
      .from('drawings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    drawingsCache = data || [];
  } catch (err) {
    console.error('خطأ في تحميل الرسومات:', err);
    showToast('تعذّر الاتصال بالسيرفر، تحقّقي من الإعداد 😕', 'error');
    drawingsCache = [];
  }
}

async function loadLifeEntries() {
  try {
    const { data, error } = await db
      .from('life_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    lifeCache = data || [];
  } catch (err) {
    console.error('خطأ في تحميل اليوميات:', err);
    lifeCache = [];
  }
}

// Global active filters
let activeDrawingFilter = 'all';
let activeLifeFilter = 'all';

// Current upload files
let currentDrawingFile = null;
let currentLifeFile = null;

// ==========================================
// 3. Navigation & Page Handling
// ==========================================
function navigateTo(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  } else if (pageId === 'about') {
    const homePage = document.getElementById('home');
    homePage.classList.add('active');
    setTimeout(() => {
      const aboutElem = document.getElementById('aboutSection');
      if (aboutElem) aboutElem.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.target === pageId);
  });

  const quickBtn = document.getElementById('quickAddBtn');
  if (quickBtn) {
    if (pageId === 'life') {
      quickBtn.textContent = '+ إضافة لقطة';
      quickBtn.onclick = () => openUploadModal('life');
    } else {
      quickBtn.textContent = '+ إضافة رسمة';
      quickBtn.onclick = () => openUploadModal('drawing');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, null, `#${pageId}`);
  closeMobileMenu();
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'home';
  navigateTo(hash);
}

function toggleMenu() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('open');
}

function closeMobileMenu() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.remove('open');
}

window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }
});

// ==========================================
// 4. Render Drawings & Featured
// ==========================================
function renderDrawings() {
  const grid     = document.getElementById('drawingsGrid');
  const homeGrid = document.getElementById('homeFeaturedGrid');
  const drawings = drawingsCache;
  const isAuth   = isArtistAuthenticated();

  const statDrawings = document.getElementById('statDrawingsCount');
  if (statDrawings) statDrawings.textContent = drawings.length;

  const filtered = activeDrawingFilter === 'all'
    ? drawings
    : drawings.filter(d => d.category === activeDrawingFilter);

  if (grid) {
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎨</div>
          <h3>لا توجد لوحات في هذا التصنيف حالياً</h3>
          ${isAuth ? `
            <p>أهلاً ميمي، اضغطي بالأسفل لإضافة لوحة جديدة!</p>
            <button class="upload-btn" onclick="openUploadModal('drawing')" style="margin: 0 auto;">
              + إضافة رسمة للمتحف
            </button>
          ` : `
            <p>ترقبوا قريباً المزيد من روائع وإبداعات ميمي الفنية 🌿</p>
          `}
        </div>
      `;
    } else {
      grid.innerHTML = filtered.map(item => `
        <article class="gallery-card" onclick="openLightbox('${item.image_url}', '${escapeHtml(item.title)}', '${escapeHtml(item.description || '')}')">
          <div class="gallery-card-img">
            <img src="${item.image_url}" alt="${escapeHtml(item.title)}" loading="lazy">
            <div class="card-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn" title="عرض مكبر"
                onclick="openLightbox('${item.image_url}', '${escapeHtml(item.title)}', '${escapeHtml(item.description || '')}')">🔍</button>
              ${isAuth ? `
                <button class="card-action-btn delete-btn" title="حذف اللوحة (خاص بميمي)"
                  onclick="deleteDrawing('${item.id}', '${item.image_url}')">🗑️</button>
              ` : ''}
            </div>
          </div>
          <div class="gallery-card-info">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description || 'لوحة فنية من إبداعات ميمي')}</p>
            <span class="card-tag">${escapeHtml(item.category_label || item.category)}</span>
          </div>
        </article>
      `).join('');
    }
  }

  if (homeGrid) {
    if (drawings.length === 0) {
      homeGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: var(--white); border-radius: var(--radius-md); box-shadow: 0 4px 24px var(--shadow); border: 1px dashed rgba(201,162,39,0.4);">
          <div style="font-size: 3.5rem; margin-bottom: 0.8rem;">🎨</div>
          <h3 style="font-family: var(--font-display); color: var(--green-dark); font-size: 1.35rem; margin-bottom: 0.5rem;">
            المتحف بانتظار روائعكِ يا ميمي
          </h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.7;">
            المعرض فارغ حالياً وجاهز لتبدئي بإضافة رسوماتكِ وإبداعاتكِ الخاصة في أي وقت.
          </p>
          <button class="btn btn-primary" onclick="navigateTo('drawings')">
            <span>✨</span> الذهاب إلى جناح الرسومات
          </button>
        </div>
      `;
    } else {
      const featuredList = drawings.slice(0, 3);
      homeGrid.innerHTML = featuredList.map(item => `
        <div class="featured-card" onclick="navigateTo('drawings')">
          <img src="${item.image_url}" alt="${escapeHtml(item.title)}" loading="lazy">
          <div class="featured-card-overlay">
            <h3>${escapeHtml(item.title)}</h3>
            <span>${escapeHtml(item.category_label || item.category)} • انقري للتفاصيل</span>
          </div>
        </div>
      `).join('');
    }
  }
}

function filterDrawings(category, btn) {
  activeDrawingFilter = category;
  document.querySelectorAll('#drawingsFilterTabs .filter-tab')
    .forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDrawings();
}

async function deleteDrawing(id, imageUrl) {
  if (!isArtistAuthenticated()) {
    showToast('عذراً، فقط ميمي تملك صلاحية حذف اللوحات!', 'error');
    return;
  }
  if (!confirm('هل أنتِ متأكدة من حذف هذه اللوحة من المتحف؟')) return;

  try {
    // حذف الصورة من Storage
    const storagePath = extractStoragePath(imageUrl);
    if (storagePath) {
      await db.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }
    // حذف السجل من قاعدة البيانات
    const { error } = await db.from('drawings').delete().eq('id', id);
    if (error) throw error;

    drawingsCache = drawingsCache.filter(d => d.id !== id);
    renderDrawings();
    showToast('تم حذف اللوحة بنجاح 🗑️');
  } catch (err) {
    console.error('Delete drawing error:', err);
    showToast('حدث خطأ أثناء الحذف!', 'error');
  }
}

// ==========================================
// 5. Render Daily Life Moments
// ==========================================
function renderLife() {
  const grid   = document.getElementById('lifeGrid');
  const entries = lifeCache;
  const isAuth  = isArtistAuthenticated();

  const statLife = document.getElementById('statLifeCount');
  if (statLife) statLife.textContent = entries.length;

  const filtered = activeLifeFilter === 'all'
    ? entries
    : entries.filter(e => e.category === activeLifeFilter);

  if (grid) {
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <h3>لا توجد صور في هذا التصنيف حالياً</h3>
          ${isAuth ? `
            <p>أهلاً ميمي، أضيفي لقطة جديدة وذكريات لطيفة!</p>
            <button class="upload-btn" onclick="openUploadModal('life')"
              style="margin: 0 auto; background: linear-gradient(135deg, var(--brown-warm), var(--brown-dark));">
              + إضافة لقطة جديدة
            </button>
          ` : `
            <p>ترقبوا قريباً المزيد من يوميات ولحظات ميمي 🌿</p>
          `}
        </div>
      `;
    } else {
      grid.innerHTML = filtered.map(item => `
        <article class="life-card" onclick="openLightbox('${item.image_url}', '${escapeHtml(item.title)}', '${escapeHtml(item.description || '')}')">
          <div class="life-card-img">
            <img src="${item.image_url}" alt="${escapeHtml(item.title)}" loading="lazy">
            <div class="card-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn" title="عرض مكبر"
                onclick="openLightbox('${item.image_url}', '${escapeHtml(item.title)}', '${escapeHtml(item.description || '')}')">🔍</button>
              ${isAuth ? `
                <button class="card-action-btn delete-btn" title="حذف الذكرى (خاص بميمي)"
                  onclick="deleteLifeEntry('${item.id}', '${item.image_url}')">🗑️</button>
              ` : ''}
            </div>
          </div>
          <div class="life-card-info">
            <div class="life-card-date">${escapeHtml(item.date_label || 'لحظة جميلة')}</div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description || '')}</p>
            <span class="life-card-tag">${escapeHtml(item.category_label || item.category)}</span>
          </div>
        </article>
      `).join('');
    }
  }
}

function filterLife(category, btn) {
  activeLifeFilter = category;
  document.querySelectorAll('#lifeFilterTabs .filter-tab')
    .forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLife();
}

async function deleteLifeEntry(id, imageUrl) {
  if (!isArtistAuthenticated()) {
    showToast('عذراً، فقط ميمي تملك صلاحية حذف الصور!', 'error');
    return;
  }
  if (!confirm('هل تريدين حذف هذه اللقطة من يومياتك؟')) return;

  try {
    const storagePath = extractStoragePath(imageUrl);
    if (storagePath) {
      await db.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }
    const { error } = await db.from('life_entries').delete().eq('id', id);
    if (error) throw error;

    lifeCache = lifeCache.filter(e => e.id !== id);
    renderLife();
    showToast('تم حذف اللقطة بنجاح 🗑️');
  } catch (err) {
    console.error('Delete life entry error:', err);
    showToast('حدث خطأ أثناء الحذف!', 'error');
  }
}

// استخراج مسار الصورة من رابط Supabase
function extractStoragePath(imageUrl) {
  try {
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) return imageUrl.substring(idx + marker.length);
  } catch {}
  return null;
}

// ==========================================
// 6. Modals & Image Upload Logic
// ==========================================
function openUploadModal(type) {
  if (!isArtistAuthenticated()) {
    showToast('⚠️ المتحف محمي: يرجى تسجيل الدخول كفنانة (ميمي) أولاً!', 'error');
    openAuthModal();
    return;
  }

  closeModals();
  if (type === 'drawing') {
    currentDrawingFile = null;
    document.getElementById('drawingModal').classList.add('open');
    document.getElementById('drawingPreview').style.display = 'none';
    document.getElementById('drawingTitle').value = '';
    document.getElementById('drawingDescription').value = '';
    document.getElementById('drawingFileInput').value = '';
  } else {
    currentLifeFile = null;
    document.getElementById('lifeModal').classList.add('open');
    document.getElementById('lifePreview').style.display = 'none';
    document.getElementById('lifeTitle').value = '';
    document.getElementById('lifeDate').value = '';
    document.getElementById('lifeDescription').value = '';
    document.getElementById('lifeFileInput').value = '';
  }
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// Handle file selection
function handleFileSelect(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('يرجى اختيار ملف صورة صالح!', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    if (type === 'drawing') {
      currentDrawingFile = file;
      const preview = document.getElementById('drawingPreview');
      document.getElementById('drawingPreviewImg').src = e.target.result;
      preview.style.display = 'block';
    } else {
      currentLifeFile = file;
      const preview = document.getElementById('lifePreview');
      document.getElementById('lifePreviewImg').src = e.target.result;
      preview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

// Drag and drop support
function setupDragAndDrop() {
  const drawingZone = document.getElementById('drawingDropZone');
  const lifeZone    = document.getElementById('lifeDropZone');

  [drawingZone, lifeZone].forEach((zone, index) => {
    if (!zone) return;
    const type = index === 0 ? 'drawing' : 'life';

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          if (type === 'drawing') {
            currentDrawingFile = file;
            document.getElementById('drawingPreviewImg').src = evt.target.result;
            document.getElementById('drawingPreview').style.display = 'block';
          } else {
            currentLifeFile = file;
            document.getElementById('lifePreviewImg').src = evt.target.result;
            document.getElementById('lifePreview').style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  });
}

// رفع الصورة إلى Supabase Storage
async function uploadImageToStorage(file, folder) {
  const ext      = file.name.split('.').pop().toLowerCase();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

async function saveDrawing() {
  if (!isArtistAuthenticated()) {
    showToast('عذراً، يجب تسجيل الدخول كفنانة أولاً!', 'error');
    openAuthModal();
    return;
  }

  const title         = document.getElementById('drawingTitle').value.trim();
  const categoryElem  = document.getElementById('drawingCategory');
  const category      = categoryElem.value;
  const categoryLabel = categoryElem.options[categoryElem.selectedIndex].text;
  const description   = document.getElementById('drawingDescription').value.trim();

  if (!title) {
    showToast('يرجى كتابة عنوان للوحة!', 'error');
    document.getElementById('drawingTitle').focus();
    return;
  }
  if (!currentDrawingFile) {
    showToast('يرجى اختيار صورة للوحة أولاً!', 'error');
    return;
  }

  const submitBtn = document.querySelector('#drawingModal .btn-modal-submit');
  if (submitBtn) { submitBtn.textContent = 'جارٍ الرفع... ⏳'; submitBtn.disabled = true; }

  try {
    const imageUrl = await uploadImageToStorage(currentDrawingFile, 'drawings');

    const { data, error } = await db.from('drawings').insert({
      title, category, category_label: categoryLabel, description, image_url: imageUrl
    }).select().single();

    if (error) throw error;

    drawingsCache.unshift(data);
    closeModals();
    renderDrawings();
    showToast('تهانينا يا ميمي! تمت إضافة اللوحة بنجاح للمتحف 🎨✨');
    navigateTo('drawings');
  } catch (err) {
    console.error('Save drawing error:', err);
    showToast('حدث خطأ أثناء الرفع! تأكدي من إعداد Supabase.', 'error');
  } finally {
    if (submitBtn) { submitBtn.textContent = 'حفظ في المتحف ✨'; submitBtn.disabled = false; }
  }
}

async function saveLifeEntry() {
  if (!isArtistAuthenticated()) {
    showToast('عذراً، يجب تسجيل الدخول كفنانة أولاً!', 'error');
    openAuthModal();
    return;
  }

  const title         = document.getElementById('lifeTitle').value.trim();
  const categoryElem  = document.getElementById('lifeCategory');
  const category      = categoryElem.value;
  const categoryLabel = categoryElem.options[categoryElem.selectedIndex].text;
  const dateLabel     = document.getElementById('lifeDate').value.trim() || new Date().toLocaleDateString('ar-EG');
  const description   = document.getElementById('lifeDescription').value.trim();

  if (!title) {
    showToast('يرجى كتابة عنوان لهذه اللحظة!', 'error');
    document.getElementById('lifeTitle').focus();
    return;
  }
  if (!currentLifeFile) {
    showToast('يرجى اختيار صورة من يومياتك!', 'error');
    return;
  }

  const submitBtn = document.querySelector('#lifeModal .btn-modal-submit');
  if (submitBtn) { submitBtn.textContent = 'جارٍ الرفع... ⏳'; submitBtn.disabled = true; }

  try {
    const imageUrl = await uploadImageToStorage(currentLifeFile, 'life');

    const { data, error } = await db.from('life_entries').insert({
      title, category, category_label: categoryLabel,
      date_label: dateLabel, description, image_url: imageUrl
    }).select().single();

    if (error) throw error;

    lifeCache.unshift(data);
    closeModals();
    renderLife();
    showToast('تم حفظ هذه الذكرى الجميلة في يومياتك 📸💖');
    navigateTo('life');
  } catch (err) {
    console.error('Save life error:', err);
    showToast('حدث خطأ أثناء الرفع! تأكدي من إعداد Supabase.', 'error');
  } finally {
    if (submitBtn) { submitBtn.textContent = 'حفظ الذكرى 💖'; submitBtn.disabled = false; }
  }
}

// ==========================================
// 7. Lightbox
// ==========================================
function openLightbox(imageSrc, title, description) {
  const lightbox = document.getElementById('lightbox');
  const img      = document.getElementById('lightboxImg');
  const caption  = document.getElementById('lightboxCaption');

  if (img && lightbox) {
    img.src = imageSrc;
    if (caption) {
      caption.innerHTML = `<strong>${title}</strong>${description
        ? `<p style="margin-top:0.4rem; font-size: 0.9rem; color: #ddd;">${description}</p>`
        : ''}`;
    }
    lightbox.classList.add('open');
  }
}

function closeLightbox(e) {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) lightbox.classList.remove('open');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeLightbox(); closeModals(); }
});

// ==========================================
// 8. Toast Notifications
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `
    <span>${type === 'error' ? '⚠️' : '🌿'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// 9. Loading Spinner
// ==========================================
function showLoadingState() {
  const spinner = `
    <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
      <div style="font-size:2.5rem; margin-bottom:0.8rem;">🌿</div>
      <p style="font-size:0.95rem;">جارٍ تحميل المعرض من السيرفر...</p>
    </div>`;
  ['drawingsGrid', 'lifeGrid', 'homeFeaturedGrid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = spinner;
  });
}

// ==========================================
// 10. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  window.addEventListener('hashchange', handleHashChange);
  setupDragAndDrop();
  updateAuthUI();

  showLoadingState();

  // تحميل البيانات من Supabase
  await Promise.all([loadDrawings(), loadLifeEntries()]);

  renderDrawings();
  renderLife();

  if (window.location.hash) {
    handleHashChange();
  } else {
    navigateTo('home');
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.target);
    });
  });
});
