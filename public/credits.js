// ✅ Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Display User's Credits
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            document.getElementById("creditBalance").innerText = `💰 ${userDoc.data().credits} Credits`;
        }
    }
});
