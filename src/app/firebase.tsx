import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {

    apiKey: "AIzaSyAI1iAuAwrLFJV8zg2iBClfzSD6MKzOoLY",
  
    authDomain: "jobscrub-project.firebaseapp.com",
  
    projectId: "jobscrub-project",
  
    storageBucket: "jobscrub-project.firebasestorage.app",
  
    messagingSenderId: "1095378267887",
  
    appId: "1:1095378267887:web:e9d3cd6eb6a6be12f9751a"
  
  };
  


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };