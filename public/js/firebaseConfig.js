// ✅ This file is loaded in a regular <script> tag (not a module)

// 🔐 Firebase Config (GLOBAL)
window.firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw", 
    authDomain: "trackrepost-921f8.firebaseapp.com", 
    projectId: "trackrepost-921f8", 
    storageBucket: "trackrepost-921f8.appspot.com", 
    messagingSenderId: "967836604288", 
    appId: "1:967836604288:web:3782d50de7384c9201d365", 
    measurementId: "G-G65Q3HC3R8" 
};

// 💳 Square Credentials (also GLOBAL)
window.SQUARE_APP_ID = "EAAAl2fPk73oOW5y3brJgQkeICaFS_tGz0w5NrFmyhciQ5E_m8GeUbdYw4gDw-wE";
window.SQUARE_LOCATION_ID = "sq0idp-PgaanSd67uGXtHuBFn7cZA";

// 🧪 Debug logs
console.log("✅ Firebase config loaded");
console.log("✅ Square App ID:", window.SQUARE_APP_ID);
console.log("✅ Square Location ID:", window.SQUARE_LOCATION_ID);