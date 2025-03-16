// ✅ Ensure Firebase is loaded before running scripts
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Authentication & Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Extract campaign ID from URL
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("campaign");

if (!campaignId) {
    console.error("🚨 No campaign ID found in URL.");
    document.getElementById("campaignTitle").innerText = "Error: No campaign found.";
} else {
    console.log(`🔄 Loading campaign ID: ${campaignId}`);
    loadCampaignDetails(campaignId);
}

// ✅ Load Campaign Details & Set Up UI
function loadCampaignDetails(campaignId) {
    db.collection("campaigns").doc(campaignId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const creditPerRepost = Math.floor((data.credits / 1000) * 10) || 1;

            document.getElementById("campaignTitle").innerText = "🔥 Repost This Track!";
            document.getElementById("soundcloudPlayer").src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}`;
            document.getElementById("creditAmount").innerText = creditPerRepost;

            // ✅ Set event listener on Repost Button
            document.getElementById("repostBtn").addEventListener("click", () => repostTrack(campaignId, creditPerRepost));
        } else {
            console.error("🚨 Campaign not found.");
            document.getElementById("campaignTitle").innerText = "Error: Campaign not found.";
        }
    }).catch(error => {
        console.error("❌ Error loading campaign details:", error);
    });
}

// ✅ Repost the Track & Update User Credits
function repostTrack(campaignId, creditPerRepost) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to earn credits.");
        return;
    }

    const userId = user.uid;

    // ✅ Check if the user has already reposted
    db.collection("reposts").doc(`${campaignId}_${userId}`).get().then(doc => {
        if (doc.exists) {
            alert("⚠️ You have already reposted this track.");
        } else {
            // ✅ Save the repost action in Firestore
            db.collection("reposts").doc(`${campaignId}_${userId}`).set({
                userId: userId,
                campaignId: campaignId,
                timestamp: new Date(),
                creditsEarned: creditPerRepost
            }).then(() => {
                console.log(`✅ Repost recorded for user: ${userId}`);

                // ✅ Update User Credits
                db.collection("users").doc(userId).get().then(userDoc => {
                    let currentCredits = userDoc.exists ? userDoc.data().credits : 0;
                    let newCredits = currentCredits + creditPerRepost;

                    db.collection("users").doc(userId).update({ credits: newCredits })
                        .then(() => {
                            alert(`✅ Repost successful! You earned ${creditPerRepost} credits.`);
                            window.location.href = "index.html"; // ✅ Redirect to dashboard
                        }).catch(error => {
                            console.error("❌ Error updating credits:", error);
                        });

                }).catch(error => {
                    console.error("❌ Error fetching user credits:", error);
                });

            }).catch(error => {
                console.error("❌ Error recording repost:", error);
            });
        }
    }).catch(error => {
        console.error("❌ Error checking repost history:", error);
    });
}

