
import {
  db,
  auth,
  provider,
  signInWithPopup
} from './firebase.js';

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const projectsGrid = document.getElementById('projectsGrid');
const uploadBtn = document.getElementById('uploadBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

const allowedEmail = 'azuredawn78@gmail.com';

let projects = [];

// Local caching to make initial load appear instant
const CACHE_KEY = 'gatoshelf_projects_v1';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function updateNavRightPadding() {
  const navRight = document.querySelector('.nav-right');
  const profileRootEl = document.getElementById('profileRoot');
  if (!navRight || !profileRootEl) return;
  try {
    const rect = profileRootEl.getBoundingClientRect();
    const padding = Math.ceil(rect.width + 16); // small gap
    navRight.style.paddingRight = padding + 'px';
  } catch (e) { /* ignore */ }
}

uploadBtn.addEventListener('click', async () => {

  try {

    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    if (user.email === allowedEmail) {
      window.location.href = 'upload.html';
    } else {
      alert('Only developers or authorized users can upload.');
    }

  } catch(error) {
    console.log(error);
  }

});

async function loadProjects() {
  // Try to render cached data immediately
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.data) && parsed.data.length) {
        projects = parsed.data;
        renderProjects(projects);
      }
    }
  } catch (e) { /* ignore cache errors */ }

  // Fetch a small initial set quickly, then hydrate full dataset in background
  try {
    const q = query(collection(db, 'projects'), orderBy('timestamp', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    const fresh = [];
    snapshot.forEach(doc => fresh.push(doc.data()));

    // update UI if different from cached
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cachedObj = cachedRaw ? JSON.parse(cachedRaw) : null;
    if (!cachedObj || JSON.stringify(cachedObj.data) !== JSON.stringify(fresh)) {
      projects = fresh;
      renderProjects(projects);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh }));
    } else {
      // refresh cache timestamp
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: cachedObj.data }));
    }

    // hydrate full dataset in background (non-blocking)
    fetchFullProjectsInBackground();
  } catch (err) {
    console.error('Failed to fetch projects:', err);
  }
}

async function fetchFullProjectsInBackground() {
  try {
    const qAll = query(collection(db, 'projects'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(qAll);
    const all = [];
    snap.forEach(d => all.push(d.data()));
    const prev = localStorage.getItem(CACHE_KEY);
    const prevObj = prev ? JSON.parse(prev) : null;
    if (!prevObj || JSON.stringify(prevObj.data) !== JSON.stringify(all)) {
      projects = all;
      renderProjects(projects);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: all }));
      try { updateNavRightPadding(); } catch (e) {}
    }
  } catch (e) {
    console.error('Failed to fully hydrate projects:', e);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s] || s));
}

function renderProjects(data) {
  projectsGrid.innerHTML = '';
  if (!data || !data.length) {
    projectsGrid.innerHTML = '<div id="noResultsMsg">No projects found.</div>';
    return;
  }

  let html = '';
  data.forEach(project => {
    const host = detectHost(project.url || '');
    const image = project.image || '';
    const name = escapeHtml(project.name || 'Untitled');
    const desc = escapeHtml(project.description || '');
    const category = escapeHtml(project.category || '');

    html += `
      <div class="project-card">
        <div class="img-preview" data-full="${image}" data-alt="${name}">
          <img src="${image}" alt="${name}" loading="lazy">
        </div>

        <div class="card-content">
          <h4>${name}</h4>
          <p>${desc}</p>
          <div class="badges">
            <div class="badge">${category}</div>
            <div class="badge">${host}</div>
          </div>
          <a class="open-btn" href="${project.url || '#'}" target="_blank">Open Page</a>
        </div>
      </div>
    `;
  });

  projectsGrid.innerHTML = html;
  try { updateNavRightPadding(); } catch (e) {}
}

// Lightbox / full-image preview
function showLightbox(src, alt = '') {
  if (!src) return;
  // prevent multiple lightboxes
  if (document.querySelector('.lightbox')) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.setAttribute('aria-label', 'Close image');
  closeBtn.innerHTML = '&times;';

  overlay.appendChild(closeBtn);
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener('keydown', onKey);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === closeBtn) close();
  });

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  document.addEventListener('keydown', onKey);
}

// Event delegation for image preview clicks
projectsGrid.addEventListener('click', (e) => {
  const preview = e.target.closest('.img-preview');
  if (!preview) return;
  const full = preview.dataset.full;
  const alt = preview.dataset.alt || '';
  showLightbox(full, alt);
});

function detectHost(url) {

  if (url.includes('github')) return 'GitHub';
  if (url.includes('vercel')) return 'Vercel';
  if (url.includes('netlify')) return 'Netlify';

  return 'Website';

}

let __searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(__searchTimer);
  __searchTimer = setTimeout(() => {
    const value = (searchInput.value || '').trim().toLowerCase();
    if (!value) { renderProjects(projects); return; }
    const filtered = projects.filter(project => {
      const name = (project.name || '').toLowerCase();
      const desc = (project.description || '').toLowerCase();
      return name.includes(value) || desc.includes(value);
    });
    renderProjects(filtered);
  }, 160);
});

sortSelect.addEventListener('change', () => {

  const value = sortSelect.value;

  if (value === 'az') {

    projects.sort((a,b) => a.name.localeCompare(b.name));

  } else if (value === 'old') {

    projects.sort((a,b) => a.timestamp - b.timestamp);

  } else {

    projects.sort((a,b) => b.timestamp - a.timestamp);

  }

  renderProjects(projects);

});

loadProjects();

// Scroll-to-top button
function createScrollTopButton() {
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8l-6 6h12l-6-6z" fill="currentColor"/></svg>`;
  document.body.appendChild(btn);

  const toggle = () => {
    if (window.scrollY > 300) btn.classList.add('show'); else btn.classList.remove('show');
  };

  window.addEventListener('scroll', toggle);
  toggle();

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

createScrollTopButton();

// Profile dropdown toggle behavior (click + hover on non-touch devices)
const profileToggle = document.getElementById('profileToggle');
const profilePanel = document.getElementById('profilePanel');
const profileRoot = document.getElementById('profileRoot');

if (profileToggle && profilePanel && profileRoot) {
  const openProfile = () => {
    profilePanel.hidden = false;
    profilePanel.classList.add('open');
    profileToggle.setAttribute('aria-expanded', 'true');
    // move focus into panel for keyboard users
    try { profilePanel.focus(); } catch (e) {}
    try { updateNavRightPadding(); } catch (e) {}
  };

  const closeProfile = () => {
    profilePanel.hidden = true;
    profilePanel.classList.remove('open');
    profileToggle.setAttribute('aria-expanded', 'false');
    try { updateNavRightPadding(); } catch (e) {}
  };
  // initial padding calculation (uses global updateNavRightPadding)
  try { updateNavRightPadding(); } catch (e) {}

  profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (profilePanel.hidden) openProfile(); else closeProfile();
  });

  profileToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      profileToggle.click();
    } else if (e.key === 'Escape') {
      closeProfile();
      profileToggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!profileRoot.contains(e.target)) closeProfile();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfile();
  });

  window.addEventListener('resize', () => {
    try { updateNavRightPadding(); } catch (e) {}
  });

  // Detect touch devices to avoid relying on hover-only behavior
  function detectTouch() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.documentElement.classList.add('has-touch');
    } else {
      document.documentElement.classList.remove('has-touch');
    }
  }
  detectTouch();
  window.addEventListener('touchstart', detectTouch, { once: true });

}

  // profile image click to open full-screen lightbox
  const profileImgLarge = document.getElementById('profileImgLarge');
  const profileImgSmall = document.getElementById('profileImgSmall');

  if (profileImgLarge) {
    profileImgLarge.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const src = profileImgLarge.dataset.full || profileImgLarge.src;
      const alt = profileImgLarge.alt || 'Profile image';
      showLightbox(src, alt);
    });
  }

  if (profileImgSmall) {
    profileImgSmall.addEventListener('click', (ev) => {
      // if panel is already open, clicking small image should open full image
      if (profilePanel && !profilePanel.hidden) {
        ev.stopPropagation();
        ev.preventDefault();
        const src = profileImgSmall.dataset.full || profileImgSmall.src;
        const alt = profileImgSmall.alt || 'Profile image';
        showLightbox(src, alt);
      }
      // otherwise allow normal toggle behavior
    });
  }
