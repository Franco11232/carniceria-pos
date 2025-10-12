//config.tsx

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDi5opbcHd6RSFcJ3Knv5RU_cZ_FWa24gQ",
  authDomain: "carniceria-8198b.firebaseapp.com",
  databaseURL: "https://carniceria-8198b-default-rtdb.firebaseio.com",
  projectId: "carniceria-8198b",
  storageBucket: "carniceria-8198b.firebasestorage.app",
  messagingSenderId: "598926483989",
  appId: "1:598926483989:web:f86ead1afb10017cc6e41c",
  measurementId: "G-5R77T104LH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

export { app, auth, db };

