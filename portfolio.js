/* ═══════════════════════════════════════
   portfolio.js — Marvin E. Matahon
═══════════════════════════════════════ */

/* ── PAGE SWITCHING ── */
function go(id, event) {
  if (event) event.preventDefault();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  document.getElementById('page-' + id).scrollTop = 0;
  if (id === 'skills') setTimeout(animateBars, 80);
}

/* ── TYPED TEXT ── */
const roles = [
  'Hardware Specialist','IT Graduate','AI Prompter',
  'Idea Originator','Problem Solver','Tech Enthusiast'
];
let roleIndex = 0, charIndex = 0, isDeleting = false;
const typedEl = document.getElementById('typedEl');
function type() {
  const word = roles[roleIndex];
  if (isDeleting) { typedEl.textContent = word.slice(0, charIndex--); }
  else            { typedEl.textContent = word.slice(0, charIndex++); }
  if (!isDeleting && charIndex > word.length) { isDeleting = true; setTimeout(type, 1600); return; }
  if (isDeleting  && charIndex < 0)           { isDeleting = false; roleIndex = (roleIndex+1)%roles.length; charIndex = 0; setTimeout(type, 400); return; }
  setTimeout(type, isDeleting ? 48 : 95);
}
type();

/* ═══════════════════════════════════════
   CARD PERSISTENCE HELPERS
═══════════════════════════════════════ */

/* Save a single card's data (no image) */
function saveCardData(card) {
  const stableId = card.dataset.cardId;
  if (!stableId) return;
  const data = {
    title:  card.querySelector('.card-title')?.value || '',
    desc:   card.querySelector('.card-desc')?.value  || '',
    tags:   [...card.querySelectorAll('.ctag')].map(t => t.textContent),
    bg:     card.querySelector('.card-img-box')?.style.background || '',
    emoji:  card.querySelector('.card-img-box span')?.textContent || '',
    type:   card.dataset.cardType || 'project'
  };
  localStorage.setItem(`card_data_${stableId}`, JSON.stringify(data));
}

/* Save card image */
function saveCardImage(stableId, dataUrl) {
  localStorage.setItem(`card_img_${stableId}`, dataUrl);
}

/* Attach live-edit listeners so changes auto-save */
function attachCardListeners(card) {
  const save = () => saveCardData(card);
  card.querySelector('.card-title')?.addEventListener('input', save);
  card.querySelector('.card-desc')?.addEventListener('input',  save);
  card.querySelectorAll('.ctag').forEach(t => t.addEventListener('input', save));
}

/* Save static card defaults on first ever load (won't overwrite user edits) */
function saveStaticCardDefaults(card) {
  const stableId = card.dataset.cardId;
  if (!stableId) return;
  if (localStorage.getItem('card_data_' + stableId)) return; // already saved
  saveCardData(card);
}

/* Build a card DOM element from saved data */
function buildCardFromData(stableId, data, imageUrl) {
  const card = document.createElement('div');
  card.className   = 'img-card';
  card.dataset.cardId   = stableId;
  card.dataset.cardType = data.type;

  const tagsHtml = data.tags.map(t => `<span class="ctag" contenteditable="true">${t}</span>`).join('');

  card.innerHTML = `
    <div class="card-img-box" onclick="pickImg(this)" style="background:${data.bg}">
      <span>${data.emoji}</span>
      <div class="card-img-overlay">📷 Upload Image</div>
    </div>
    <div class="card-body">
      <input class="card-title" type="text" value="${data.title.replace(/"/g,'&quot;')}">
      <div class="card-tags">${tagsHtml}</div>
      <textarea class="card-desc">${data.desc}</textarea>
    </div>`;

  if (imageUrl) {
    const box  = card.querySelector('.card-img-box');
    const span = box.querySelector('span');
    if (span) span.style.display = 'none';
    const img  = document.createElement('img');
    img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
    img.src = imageUrl;
    box.insertBefore(img, box.firstChild);
    box.style.background = 'none';
  }

  attachCardListeners(card);
  return card;
}

/* ─────────────────────────────────────
   RESTORE DYNAMIC CARDS ON LOAD
───────────────────────────────────── */
function restoreDynamicCards() {
  const grids = {
    projectsGrid: { el: document.getElementById('projectsGrid'), type: 'project' },
    certsGrid:    { el: document.getElementById('certsGrid'),    type: 'cert'    }
  };

  Object.entries(grids).forEach(([gridId, { el: grid, type }]) => {
    if (!grid) return;
    const addBtn = grid.querySelector('.add-btn');

    // Find all dynamic card keys for this grid, sorted by index
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`card_data_${gridId}_dynamic_`)) keys.push(key);
    }
    keys.sort();

    keys.forEach(key => {
      try {
        const data     = JSON.parse(localStorage.getItem(key));
        const stableId = key.replace('card_data_', '');
        const imageUrl = localStorage.getItem(`card_img_${stableId}`);
        const card     = buildCardFromData(stableId, data, imageUrl);
        grid.insertBefore(card, addBtn);
      } catch(e) { console.warn('Failed to restore card:', key, e); }
    });
  });
}

/* ─────────────────────────────────────
   LOAD IMAGES FOR BUILT-IN (static) CARDS
───────────────────────────────────── */
function assignStaticIds() {
  const grids = ['projectsGrid', 'certsGrid'];
  grids.forEach(gridId => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    // Only assign to cards that don't already have an ID (built-in ones)
    grid.querySelectorAll('.img-card:not([data-card-id])').forEach((card, idx) => {
      const stableId = `${gridId}_static_${idx}`;
      card.dataset.cardId   = stableId;
      card.dataset.cardType = gridId === 'certsGrid' ? 'cert' : 'project';
      const box = card.querySelector('.card-img-box');
      if (box) box.dataset.stableId = stableId;
      attachCardListeners(card);
      saveStaticCardDefaults(card); // save HTML defaults on first load
    });
  });
}

function loadStaticCardImages() {
  document.querySelectorAll('.img-card[data-card-id]').forEach(card => {
    const stableId = card.dataset.cardId;

    // Restore saved text (title + desc) for built-in cards
    const saved = localStorage.getItem(`card_data_${stableId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const titleEl = card.querySelector('.card-title');
        const descEl  = card.querySelector('.card-desc');
        if (titleEl && data.title) titleEl.value = data.title;
        if (descEl  && data.desc)  descEl.value  = data.desc;
      } catch(e) {}
    }

    // Restore image
    const imageUrl = localStorage.getItem(`card_img_${stableId}`);
    if (!imageUrl) return;
    const box = card.querySelector('.card-img-box');
    if (!box)  return;
    applyImageToBox(box, imageUrl);
  });
}

/* ─────────────────────────────────────
   PROFILE PHOTO
───────────────────────────────────── */
function loadSavedProfilePhoto() {
  const saved = localStorage.getItem('marvin_profile_photo');
  const img   = document.getElementById('photoImg');
  const ph    = document.getElementById('photoPlaceholder');
  if (saved && img) {
    img.src = saved;
    img.style.display = 'block';
    if (ph) ph.style.display = 'none';
  }
}

window.loadPhoto = function(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const dataUrl = ev.target.result;
    const img = document.getElementById('photoImg');
    const ph  = document.getElementById('photoPlaceholder');
    if (ph)  ph.style.display  = 'none';
    img.src = dataUrl;
    img.style.display = 'block';
    localStorage.setItem('marvin_profile_photo', dataUrl);
  };
  reader.readAsDataURL(file);
};

/* ─────────────────────────────────────
   PICK IMAGE FOR A CARD BOX
───────────────────────────────────── */
function applyImageToBox(box, dataUrl) {
  const span = box.querySelector('span');
  if (span) span.style.display = 'none';
  let img = box.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
    box.insertBefore(img, box.firstChild);
  }
  img.src = dataUrl;
  box.style.background = 'none';
}

window.pickImg = function(box) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const dataUrl  = ev.target.result;
      applyImageToBox(box, dataUrl);
      // Find the stable ID from the parent card
      const card     = box.closest('.img-card');
      const stableId = card?.dataset.cardId || box.dataset.stableId;
      if (stableId) saveCardImage(stableId, dataUrl);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

/* ─────────────────────────────────────
   ADD NEW CARD (saved to localStorage)
───────────────────────────────────── */
function addCard(gridId, type) {
  const grid   = document.getElementById(gridId);
  const addBtn = grid.querySelector('.add-btn');
  const emojis = { project:['💡','🔧','🌐','📱','🖥'], cert:['🏅','📜','🎓','⭐','🏆'] };
  const bgs    = [
    'linear-gradient(135deg,#1c1510,#3d2008)',
    'linear-gradient(135deg,#101c14,#0f2d1a)',
    'linear-gradient(135deg,#18100c,#2d1810)',
    'linear-gradient(135deg,#1a1208,#2d1e08)'
  ];

  // Count existing dynamic cards for this grid to make a unique index
  let dynCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`card_data_${gridId}_dynamic_`)) dynCount++;
  }

  const stableId = `${gridId}_dynamic_${Date.now()}_${dynCount}`;
  const emoji    = emojis[type][Math.floor(Math.random() * 5)];
  const bg       = bgs[Math.floor(Math.random() * bgs.length)];
  const data     = {
    title: type === 'project' ? 'New Project' : 'New Certificate',
    desc:  'Click to edit description.',
    tags:  [type === 'project' ? 'Tag' : 'Issuer'],
    bg, emoji, type
  };

  // Save immediately so it survives reload
  localStorage.setItem(`card_data_${stableId}`, JSON.stringify(data));

  const card = buildCardFromData(stableId, data, null);
  card.style.animation = 'fadeUp 0.35s ease both';
  grid.insertBefore(card, addBtn);
}

/* ── Skill bar animation ── */
function animateBars() {
  document.querySelectorAll('.sk-fill').forEach(bar => {
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 60);
  });
}

/* ── Contact form ── */
function sendMsg(e) {
  e.preventDefault();
  const btn = document.getElementById('sendBtn');
  btn.textContent = '✓ Message Sent!';
  btn.style.background = '#16a34a';
  setTimeout(() => { btn.textContent = 'Send Message ✈'; btn.style.background = ''; e.target.reset(); }, 2800);
}

/* ── Clear all saved data ── */
function clearAllSavedImages() {
  if (confirm('⚠️ This will delete ALL saved images and added cards. Continue?')) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('card_img_') || key.startsWith('card_data_') || key === 'marvin_profile_photo')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    alert('Cleared! Reloading...');
    location.reload();
  }
}

/* ═══════════════════════════════════════
   INIT — runs when DOM is ready
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  assignStaticIds();        // 1. give built-in cards stable IDs
  restoreDynamicCards();    // 2. rebuild any added cards from localStorage
  loadStaticCardImages();   // 3. restore images on built-in cards
  loadSavedProfilePhoto();  // 4. restore profile photo
});