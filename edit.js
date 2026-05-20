import { db, auth, provider, signInWithPopup } from './firebase.js';

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const allowedEmail = 'azuredawn78@gmail.com';

async function protectPage(){
  try{
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if(user.email !== allowedEmail){
      alert("Only developer can edit projects.");
      window.location.href = "index.html";
    }
  }catch(error){
    console.log(error);
  }
}

protectPage();

const projectsList = document.getElementById('projectsList');
const searchInput = document.getElementById('searchInputEdit');
let projectEntries = [];

async function loadProjects(){
  projectsList.innerHTML = '<h2>Loading...</h2>';

  const q = query(
    collection(db, 'projects'),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);

  projectsList.innerHTML = '';
  projectEntries = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="img-preview" data-full="${data.image}" data-alt="${data.name}">
        <img src="${data.image}" alt="${data.name}">
      </div>

      <div class="card-content">
        <h4>${data.name}</h4>
        <p>${data.description}</p>
        <div class="badges">
          <div class="badge">${data.category}</div>
        </div>

        <div style="display:flex; gap:10px; margin-top:10px;">
          <a class="open-btn" href="modify.html?id=${id}">Edit</a>
          <button class="delete-btn" style="background:#ff4d4d; color:white; border:none; padding:12px 14px; border-radius:12px; cursor:pointer;">Delete</button>
        </div>

      </div>
    `;

    projectsList.appendChild(card);

    // keep a reference for search filtering
    projectEntries.push({ id, data, card });

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      const ok = confirm('Are you sure you want to delete this project? This action cannot be undone.');
      if(!ok) return;
      try{
        await deleteDoc(doc(db, 'projects', id));
        // remove from DOM and entries
        card.remove();
        projectEntries = projectEntries.filter(e => e.id !== id);
      }catch(err){
        console.error(err);
        alert('Failed to delete project: ' + (err.message || err));
      }
    });

  });

}

loadProjects();

// Search/filter behavior
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = (searchInput.value || '').trim().toLowerCase();
    let visible = 0;
    projectEntries.forEach(entry => {
      const text = ((entry.data.name || '') + ' ' + (entry.data.description || '') + ' ' + (entry.data.category || '')).toLowerCase();
      const show = term === '' || text.includes(term);
      entry.card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const existing = document.getElementById('noResultsMsg');
    if (visible === 0) {
      if (!existing) {
        const msg = document.createElement('div');
        msg.id = 'noResultsMsg';
        msg.style.color = '#aaa';
        msg.style.gridColumn = '1/-1';
        msg.style.textAlign = 'center';
        msg.textContent = 'No projects match your search.';
        projectsList.appendChild(msg);
      }
    } else {
      if (existing) existing.remove();
    }
  });
}

// Lightbox preview reuse (similar to app.js)
projectsList.addEventListener('click', (e) => {
  const preview = e.target.closest('.img-preview');
  if (!preview) return;
  const full = preview.dataset.full;
  const alt = preview.dataset.alt || '';
  if (!full) return;

  // show a simple lightbox
  if (document.querySelector('.lightbox')) return;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  const img = document.createElement('img');
  img.src = full;
  img.alt = alt;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.innerHTML = '&times;';
  overlay.appendChild(closeBtn);
  overlay.appendChild(img);
  document.body.appendChild(overlay);
  function close(){ if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); document.removeEventListener('keydown', onKey); }
  overlay.addEventListener('click', (ev) => { if(ev.target === overlay || ev.target === closeBtn) close(); });
  function onKey(ev){ if(ev.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
});
