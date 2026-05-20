
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0x0nt626-B2ylBpsnsmHJ3SeiaZeLGbg",
  authDomain: "gatoshelf.firebaseapp.com",
  projectId: "gatoshelf",
  storageBucket: "gatoshelf.firebasestorage.app",
  messagingSenderId: "629445596740",
  appId: "1:629445596740:web:f47f54474d23908a648e11"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export {
  db,
  auth,
  provider,
  signInWithPopup
};