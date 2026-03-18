// js/firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// 🟨 NEW: Import the Firestore Database tools
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIDcQ0lgjolWBtXJTZ2qKV70OVX2bgXdQ",
  authDomain: "flixrate-40aba.firebaseapp.com",
  projectId: "flixrate-40aba",
  storageBucket: "flixrate-40aba.firebasestorage.app",
  messagingSenderId: "280213720819",
  appId: "1:280213720819:web:dce66c43712fc35bc77186",
  measurementId: "G-RWB8SBTG9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// 🟨 NEW: Initialize the database
const db = getFirestore(app);

// 🟨 CHANGED: Make sure to export 'db' at the end!
export { app, auth, db };