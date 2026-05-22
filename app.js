
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
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const projectsGrid = document.getElementById('projectsGrid');
const uploadBtn = document.getElementById('uploadBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

const allowedEmail = 'azuredawn78@gmail.com';

let projects = [];

uploadBtn.addEventListener('click', async () => {

  try {

    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    if (user.email === allowedEmail) {
      window.location.href = 'upload.html';
    } else {
      alert('Only developer can upload projects.');
    }

  } catch(error) {
    console.log(error);
  }

});

async function loadProjects() {

  projectsGrid.innerHTML = '<h2>Loading...</h2>';

  const q = query(
    collection(db, 'projects'),
    orderBy('timestamp', 'desc')
  );

  const querySnapshot = await getDocs(q);

  projects = [];

  querySnapshot.forEach((doc) => {
    projects.push(doc.data());
  });

  renderProjects(projects);

}

function renderProjects(data) {

  projectsGrid.innerHTML = '';

  data.forEach(project => {

    const host = detectHost(project.url);

    projectsGrid.innerHTML += `

      <div class="project-card">

        <div class="img-preview" data-full="${project.image}" data-alt="${project.name}">
          <img src="${project.image}" alt="${project.name}">
        </div>

        <div class="card-content">

          <h4>${project.name}</h4>

          <p>${project.description}</p>

          <div class="badges">
            <div class="badge">${project.category}</div>
            <div class="badge">${host}</div>
          </div>

          <a class="open-btn" href="${project.url}" target="_blank">
            Open Page
          </a>

        </div>

      </div>

    `;

  });

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

searchInput.addEventListener('input', () => {

  const value = searchInput.value.trim().toLowerCase();

  const filtered = projects.filter(project =>
    project.name.toLowerCase().includes(value) ||
    project.description.toLowerCase().includes(value)
  );

  renderProjects(filtered);

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
