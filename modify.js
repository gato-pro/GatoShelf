import { db, auth, provider, signInWithPopup } from './firebase.js';

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const allowedEmail = 'azuredawn78@gmail.com';

async function protectPage(){
  try{
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if(user.email !== allowedEmail){
      alert("Only developers or authorized users can upload.");
      window.location.href = "index.html";
    }
  }catch(error){
    console.log(error);
  }
}

protectPage();

function getIdFromQuery(){
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

const id = getIdFromQuery();
if(!id){
  alert('Missing project id.');
  window.location.href = 'edit.html';
}

const nameInput = document.getElementById('name');
const urlInput = document.getElementById('url');
const imageInput = document.getElementById('image');
const imageFileInput = document.getElementById('imageFile');
const imgbbKeyInput = document.getElementById('imgbbKey');
const descriptionInput = document.getElementById('description');
const categorySelect = document.getElementById('category');
const modifyForm = document.getElementById('modifyForm');
const deleteBtn = document.getElementById('deleteBtn');

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

async function loadProject(){
  try{
    const ref = doc(db, 'projects', id);
    const snap = await getDoc(ref);
    if(!snap.exists()){
      alert('Project not found.');
      window.location.href = 'edit.html';
      return;
    }
    const data = snap.data();
    nameInput.value = data.name || '';
    urlInput.value = data.url || '';
    imageInput.value = data.image || '';
    descriptionInput.value = data.description || '';
    if(data.category){
      for(let i=0;i<categorySelect.options.length;i++){
        if(categorySelect.options[i].text === data.category){
          categorySelect.selectedIndex = i; break;
        }
      }
    }
  }catch(err){
    console.error(err);
    alert('Failed to load project: ' + (err.message || err));
  }
}

loadProject();

modifyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let image = imageInput.value.trim() || '';
  if(imageFileInput && imageFileInput.files && imageFileInput.files.length > 0){
    const key = imgbbKeyInput.value.trim();
    if(!key){
      alert('Please provide an imgbb API key to upload the image file.');
      return;
    }
    try{
      image = await uploadToImgbb(imageFileInput.files[0], key);
    }catch(err){
      console.error(err);
      alert('Image upload failed.');
      return;
    }
  }

  try{
    const ref = doc(db, 'projects', id);
    await updateDoc(ref, {
      name: nameInput.value.trim(),
      url: urlInput.value.trim(),
      image: image,
      description: descriptionInput.value.trim(),
      category: categorySelect.value,
      timestamp: Date.now()
    });
    alert('Project updated successfully.');
    window.location.href = 'edit.html';
  }catch(err){
    console.error(err);
    alert('Failed to update project: ' + (err.message || err));
  }
});

deleteBtn.addEventListener('click', async () => {
  const ok = confirm('Delete this project? This action is irreversible.');
  if(!ok) return;
  try{
    await deleteDoc(doc(db, 'projects', id));
    alert('Project deleted.');
    window.location.href = 'edit.html';
  }catch(err){
    console.error(err);
    alert('Failed to delete project: ' + (err.message || err));
  }
});
