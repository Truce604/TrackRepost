
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
} else {
    console.log("⚠️ Firebase already initialized.");
}

// ✅ Firebase Authentication & Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Square Payment Configuration
const squareConfig = {
    applicationId: "sandbox-sq0idb-Y5w5v1OaX1oTe0HeEWJ6xQ",
    accessToken: "EAAAlzVsfiRCCF1YY0pZQH6IMrgAcbBSMUA9-YTM5sq_wBUr2UhaGP2l05E7DFgu",
    locationId: "LEMSZD58E9CNX"
};

// ✅ Export Firebase & Square Config
export { firebaseConfig, auth, db, squareConfig };
