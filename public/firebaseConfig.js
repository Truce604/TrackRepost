// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
    authDomain: "trackrepost-921f8.firebaseapp.com", 
    projectId: "trackrepost-921f8", 
    storageBucket: "trackrepost-921f8.appspot.com", 
    messagingSenderId: "967836604288", 
    appId: "1:967836604288:web:3782d50de7384c9201d365", 
    measurementId: "G-G65Q3HC3R8" 
};

// ✅ Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase Initialized Successfully!");
} else {
    console.log("⚠️ Firebase already initialized.");
}

// ✅ Firebase Authentication & Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Square Configuration
const SQUARE_APPLICATION_ID = "EAAAl2fPk73oOW5y3brJgQkeICaFS_tGz0w5NrFmyhciQ5E_m8GeUbdYw4gDw-wE";  
const SQUARE_LOCATION_ID = "sq0idp-PgaanSd67uGXtHuBFn7cZA";

console.log("✅ Square App ID:", window.SQUARE_APPLICATION_ID);
console.log("✅ Square Location ID:", window.SQUARE_LOCATION_ID);

