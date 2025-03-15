// ✅ Ensure Firebase is loaded before running scripts 
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Get Track & Campaign Data from URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("campaignId");
const trackUrl = urlParams.get("trackUrl");

// ✅ Load Track in iFrame
const trackContainer = document.getElementById("trackContainer");
if (trackContainer && trackUrl) {
    trackContainer.innerHTML = `
        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}">
        </iframe>
    `;
} else {
    console.error("❌ Track URL missing or invalid.");
}

// ✅ Open Track on SoundCloud
document.getElementById("openTrackBtn").addEventListener("click", function () {
    if (trackUrl) {
        window.open(trackUrl, "_blank");
    } else {
        alert("❌ Track URL not found.");
    }
});

// ✅ Handle Confirmation of Actions
document.getElementById("confirmActionsBtn").addEventListener("click", async function () {
    if (!auth.currentUser) {
        alert("🚨 You must be logged in to confirm your actions.");
        return;
    }

    const userRef = db.collection("users").doc(auth.currentUser.uid);
    const campaignRef = db.collection("campaigns").doc(campaignId);

    try {
        // Get user and campaign data
        const userDoc = await userRef.get();
        const campaignDoc = await campaignRef.get();
        if (!userDoc.exists || !campaignDoc.exists) {
            alert("❌ Error fetching data.");
            return;
        }

        const userData = userDoc.data();
        const campaignData = campaignDoc.data();

        // Calculate credits based on actions
        let creditsEarned = 3; // 1 credit for like, 2 for comment
        let repostCredits = Math.floor(userData.followers / 100); // 1 credit per 100 followers
        creditsEarned += repostCredits;

        if (campaignData.creditsRemaining < creditsEarned) {
            alert("⚠️ Not enough credits left in this campaign.");
            return;
        }

        // Update Firestore (Transaction)
        await db.runTransaction(async (transaction) => {
            const updatedCampaign = await transaction.get(campaignRef);
            const updatedUser = await transaction.get(userRef);

            if (!updatedCampaign.exists || !updatedUser.exists) return;

            let remainingCredits = updatedCampaign.data().creditsRemaining - creditsEarned;
            let newUserCredits = (updatedUser.data().credits || 0) + creditsEarned;

            transaction.update(campaignRef, { creditsRemaining: remainingCredits });
            transaction.update(userRef, { credits: newUserCredits });
        });

        alert(`✅ Actions verified! You earned ${creditsEarned} credits.`);
        window.location.href = "index.html"; // Redirect back to main page
    } catch (error) {
        console.error("❌ Error confirming actions:", error);
        alert("⚠️ Error confirming actions. Try again.");
    }
});

