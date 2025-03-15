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

// ✅ Handle Repost Confirmation
document.getElementById("confirmRepostBtn").addEventListener("click", async function () {
    if (!auth.currentUser) {
        alert("🚨 You must be logged in to confirm your repost.");
        return;
    }

    const userRef = db.collection("users").doc(auth.currentUser.uid);
    const campaignRef = db.collection("campaigns").doc(campaignId);

    try {
        // Get user data (for followers count)
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            alert("❌ User data not found.");
            return;
        }
        const userData = userDoc.data();
        const followerCount = userData.followers || 100; // Default 100 if not set

        // Calculate earned credits
        let earnedCredits = Math.max(1, Math.floor(followerCount / 100)) + 1; // +1 for liking
        earnedCredits += 2; // +2 for commenting

        // Get campaign data
        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists) {
            alert("❌ Campaign not found.");
            return;
        }
        const campaignData = campaignDoc.data();
        if (campaignData.creditsRemaining < earnedCredits) {
            alert("⚠️ Not enough credits left in this campaign.");
            return;
        }

        // Update Firestore (Transaction)
        await db.runTransaction(async (transaction) => {
            const updatedCampaign = await transaction.get(campaignRef);
            const updatedUser = await transaction.get(userRef);

            if (!updatedCampaign.exists || !updatedUser.exists) return;

            let remainingCredits = updatedCampaign.data().creditsRemaining - earnedCredits;
            let newRepostCount = (updatedCampaign.data().repostCount || 0) + 1;
            let newUserCredits = (updatedUser.data().credits || 0) + earnedCredits;

            transaction.update(campaignRef, {
                creditsRemaining: remainingCredits,
                repostCount: newRepostCount
            });

            transaction.update(userRef, {
                credits: newUserCredits
            });
        });

        alert(`✅ Repost successful! You earned ${earnedCredits} credits.`);
        window.location.href = "index.html"; // Redirect back to main page
    } catch (error) {
        console.error("❌ Error confirming repost:", error);
        alert("⚠️ Error confirming repost. Try again.");
    }
});
