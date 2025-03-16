
// ✅ Ensure Firebase is loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check repost.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Auth & Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Get track ID from URL
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("campaign");

// ✅ Load Track Details
function loadTrackDetails() {
    const trackDetailsDiv = document.getElementById("trackDetails");

    if (!campaignId) {
        trackDetailsDiv.innerHTML = "<p>🚨 No track found.</p>";
        return;
    }

    db.collection("campaigns").doc(campaignId).get()
        .then(doc => {
            if (!doc.exists) {
                trackDetailsDiv.innerHTML = "<p>🚨 Track not found.</p>";
                return;
            }

            const data = doc.data();
            trackDetailsDiv.innerHTML = `
                <h3>${data.track}</h3>
                <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                </iframe>
                <p>🎁 Earn ${data.credits} credits for reposting this track!</p>
            `;
        })
        .catch(error => {
            console.error("❌ Error loading track:", error);
        });
}

// ✅ Handle Repost Confirmation
document.getElementById("confirmRepostBtn").addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    db.collection("campaigns").doc(campaignId).get().then(doc => {
        if (!doc.exists) {
            alert("🚨 Campaign no longer exists.");
            return;
        }

        const data = doc.data();
        const creditsEarned = data.credits;
        const ownerId = data.owner;

        // ✅ Update user credits
        db.collection("users").doc(user.uid).update({
            credits: firebase.firestore.FieldValue.increment(creditsEarned)
        });

        // ✅ Log the repost
        db.collection("reposts").add({
            userId: user.uid,
            campaignId: campaignId,
            timestamp: new Date()
        });

        alert("✅ Reposted successfully! Credits added.");
        window.location.href = "index.html"; // Redirect to main page
    }).catch(error => {
        console.error("❌ Error reposting:", error);
    });
});

// ✅ Load Track Details on Page Load
document.addEventListener("DOMContentLoaded", loadTrackDetails);

