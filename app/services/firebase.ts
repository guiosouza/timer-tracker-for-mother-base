// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
    apiKey: "AIzaSyBIGFvjIYOWG_DUL-Jb_-SqglstP-cYPFI",
    authDomain: "mother-base-database.firebaseapp.com",
    databaseURL: "https://mother-base-database-default-rtdb.firebaseio.com",
    projectId: "mother-base-database",
    storageBucket: "mother-base-database.firebasestorage.app",
    messagingSenderId: "623165561618",
    appId: "1:623165561618:web:ed9b8285dc35859cb031cb",
    measurementId: "G-8ECGGERMYH"
  };

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { auth, database, onAuthStateChanged };
