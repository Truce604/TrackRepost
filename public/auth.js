
// ✅ Initialize Firebase (Only Declare Once)
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyAGmhdeSxshYSmaAbsMtda4qa1K3TeKiYw",
        authDomain: "trackrepost-921f8.firebaseapp.com",
        projectId: "trackrepost-921f8",
        storageBucket: "trackrepost-921f8.appspot.com",
        messagingSenderId: "967836604288",
        appId: "1:967836604288:web:3782d50de7384c9201d365",
        measurementId: "G-G65Q3HC3R8"
    });
    console.log("✅ Firebase Initialized Successfully!");
}

// ✅ Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ FUNCTION: REPOST A TRACK
window.repostTrack = async function (campaignId, ownerId, trackUrl) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    try {
        const userRef = db.collection("users").doc(user.uid);
        const campaignRef = db.collection("campaigns").doc(campaignId);
        const repostRef = db.collection("reposts").doc(`${campaignId}_${user.uid}`);

        // ✅ Check if user already reposted
        const repostDoc = await repostRef.get();
        if (repostDoc.exists) {
            alert("🚨 You have already reposted this track.");
            return;
        }

        // ✅ Get campaign data
        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists) {
            alert("🚨 Campaign not found.");
            return;
        }
        const campaignData = campaignDoc.data();

        // ✅ Get user data
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            alert("🚨 User data not found.");
            return;
        }
        const userData = userDoc.data();

        // ✅ Get follower count to calculate credits
        let followers = Math.max(100, Math.floor(userData.followers / 100) * 100); // Round to nearest 100
        let creditsEarned = Math.min(followers / 100 * 10, 100); // Max 100 credits per repost

        if (campaignData.credits < creditsEarned) {
            alert("🚨 Not enough credits in the campaign.");
            return;
        }

        // ✅ Update Firestore (Transaction)
        await firebase.firestore().runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            const freshCampaignDoc = await transaction.get(campaignRef);

            if (freshCampaignDoc.data().credits < creditsEarned) {
                throw new Error("Not enough credits in the campaign.");
            }

            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(creditsEarned)
            });

            transaction.update(campaignRef, {
                credits: firebase.firestore.FieldValue.increment(-creditsEarned)
            });

            transaction.set(repostRef, {
                userId: user.uid,
                campaignId: campaignId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // ✅ Open SoundCloud Repost Window
        window.open(trackUrl, "_blank");
        alert(`✅ Repost Successful! You earned ${creditsEarned} credits.`);

    } catch (error) {
        console.error("❌ Error reposting:", error);
        alert(`❌ Error: ${error.message}`);
    }
};

// ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    loadActiveCampaigns();
});

