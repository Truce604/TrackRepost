


const firebaseConfig = {
    apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
    authDomain: "trackrepost-921f8.firebaseapp.com",
    projectId: "trackrepost-921f8",
    storageBucket: "trackrepost-921f8.appspot.com",
    messagingSenderId: "967836604288",
    appId: "1:967836604288:web:3782d50de7384c9201d365"
};


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


function signup(email, password) {
    return auth.createUserWithEmailAndPassword(email, password);
}


function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}


function logout() {
    return auth.signOut();
}

// Submit Track Function (Free Users Limited to 1 Track)
async function submitTrack() {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit a track.");
        return;
    }

    const soundcloudUrl = document.getElementById("soundcloudUrl").value;
    if (!soundcloudUrl) {
        alert("Please enter a valid SoundCloud URL.");
        return;
    }

    const userTrackRef = db.collection("users").doc(user.uid);
    const userTrackSnap = await userTrackRef.get();

    if (userTrackSnap.exists && userTrackSnap.data().track) {
        alert("Free users can only submit one track. Upgrade to submit more.");
        return;
    }

    await userTrackRef.set({ track: soundcloudUrl }, { merge: true });

    document.getElementById("currentTrackMessage").innerText = "Your current track: " + soundcloudUrl;
    alert("SoundCloud track submitted successfully!");
}
