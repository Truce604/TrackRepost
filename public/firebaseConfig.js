
const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
    authDomain: "trackrepost-921f8.firebaseapp.com", 
    projectId: "trackrepost-921f8", 
    storageBucket: "trackrepost-921f8.appspot.com", 
    messagingSenderId: "967836604288", 
    appId: "1:967836604288:web:3782d50de7384c9201d365", 
    measurementId: "G-G65Q3HC3R8" 
};

// ✅ Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase Initialized Successfully!");
}

// ✅ Firestore & Auth Exports
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Square Production Credentials
const SQUARE_ACCESS_TOKEN = "EAAAl2fPk73oOW5y3brJgQkeICaFS_tGz0w5NrFmyhciQ5E_m8GeUbdYw4gDw-wE"; // Get this from Square Dashboard
const SQUARE_LOCATION_ID = "sq0idp-PgaanSd67uGXtHuBFn7cZA"; // Get this from Square Dashboard

