import {
  db,
  auth,
  provider,
  signInWithPopup
} from './firebase.js';

import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const uploadForm = document.getElementById('uploadForm');

const allowedEmail = "azuredawn78@gmail.com";

async function protectPage(){
  try{
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if(user.email !== allowedEmail){
      alert("Only developer can upload.");
      window.location.href = "index.html";
    }
  }catch(error){
    console.log(error);
  }
}

protectPage();

async function uploadToImgbb(file, key){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const form = new FormData();
        form.append('image', base64);
        form.append('key', key);

        const res = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: form
        });

        const data = await res.json();
        if(data && data.success && data.data && data.data.url){
          resolve(data.data.url);
        } else {
          reject(new Error('imgbb upload failed'));
        }
      } catch(err){
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const url = document.getElementById('url').value.trim();
  const imageUrlInput = document.getElementById('image').value.trim();
  const imageFileInput = document.getElementById('imageFile');
  const imgbbKey = document.getElementById('imgbbKey') ? document.getElementById('imgbbKey').value.trim() : '';
  const description = document.getElementById('description').value.trim();
  const category = document.getElementById('category').value;

  let image = imageUrlInput || '';

  if(imageFileInput && imageFileInput.files && imageFileInput.files.length > 0){
    if(!imgbbKey){
      alert('Please provide an imgbb API key to upload the image file.');
      return;
    }
    try{
      image = await uploadToImgbb(imageFileInput.files[0], imgbbKey);
    }catch(err){
      console.error(err);
      alert('Image upload failed. Check the console for details.');
      return;
    }
  }

  if(!image){
    alert('Please provide an image URL or upload a file.');
    return;
  }

  try{
    await addDoc(collection(db, "projects"), {
      name,
      url,
      image,
      description,
      category,
      timestamp: Date.now()
    });
    alert("Project uploaded successfully!");
    uploadForm.reset();
    window.location.href = "index.html";
  }catch(err){
    console.error(err);
    alert('Failed to upload project: ' + (err.message || err));
  }
});

// Scroll-to-top button for long upload page
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