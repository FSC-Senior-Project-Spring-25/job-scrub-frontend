import { initializeApp, getApps, getApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyAI1iAuAwrLFJV8zg2iBClfzSD6MKzOoLY",
  authDomain: "jobscrub-project.firebaseapp.com",
  projectId: "jobscrub-project",
  storageBucket: "jobscrub-project.firebasestorage.app",
  messagingSenderId: "1095378267887",
  appId: "1:1095378267887:web:e9d3cd6eb6a6be12f9751a"
};
// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

export { app, auth, db };