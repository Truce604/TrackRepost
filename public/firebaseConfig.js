// ✅ Firebase Configuration
export const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
    authDomain: "trackrepost-921f8.firebaseapp.com", 
    projectId: "trackrepost-921f8", 
    storageBucket: "trackrepost-921f8.appspot.com", 
    messagingSenderId: "967836604288", 
    appId: "1:967836604288:web:3782d50de7384c9201d365", 
    measurementId: "G-G65Q3HC3R8" 
};

// ✅ Square Credentials
window.SQUARE_APP_ID = "EAAAl2fPk73oOW5y3brJgQkeICaFS_tGz0w5NrFmyhciQ5E_m8GeUbdYw4gDw-wE";
window.SQUARE_LOCATION_ID = "sq0idp-PgaanSd67uGXtHuBFn7cZA";

// ✅ Ensure Firebase is Initialized Only Once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase Initialized Successfully!");
} else {
    console.log("⚠️ Firebase Already Initialized.");
}

// ✅ Declare Global `auth` and `db` (Avoid Redeclaration Issues)
window.auth = firebase.auth();
window.db = firebase.firestore();

// ✅ Debugging Square Details
console.log("✅ Square App ID:", window.SQUARE_APP_ID);
console.log("✅ Square Location ID:", window.SQUARE_LOCATION_ID);












