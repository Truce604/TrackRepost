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
            const commentCredits = 2; // Earn 2 credits per comment

            document.getElementById("campaignTitle").innerText = "💬 Comment on This Track!";
            document.getElementById("soundcloudPlayer").src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}`;
            document.getElementById("creditAmount").innerText = commentCredits;

            // ✅ Open SoundCloud to Comment
            document.getElementById("openSoundCloudBtn").addEventListener("click", () => {
                window.open(data.track, "_blank");
            });

            // ✅ Confirm Comment Button
            document.getElementById("confirmCommentBtn").addEventListener("click", () => confirmComment(campaignId, commentCredits));
        } else {
            console.error("🚨 Campaign not found.");
            document.getElementById("campaignTitle").innerText = "Error: Campaign not found.";
        }
    }).catch(error => {
        console.error("❌ Error loading campaign details:", error);
    });
}

// ✅ Confirm Comment & Update User Credits
function confirmComment(campaignId, commentCredits) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to earn credits.");
        return;
    }

    const userId = user.uid;

    // ✅ Check if the user already earned credits for commenting
    db.collection("comments").doc(`${campaignId}_${userId}`).get().then(doc => {
        if (doc.exists) {
            alert("⚠️ You have already earned credits for commenting on this track.");
        } else {
            // ✅ Save the comment action in Firestore
            db.collection("comments").doc(`${campaignId}_${userId}`).set({
                userId: userId,
                campaignId: campaignId,
                timestamp: new Date(),
                creditsEarned: commentCredits
            }).then(() => {
                console.log(`✅ Comment confirmed for user: ${userId}`);

                // ✅ Update User Credits
                db.collection("users").doc(userId).get().then(userDoc => {
                    let currentCredits = userDoc.exists ? userDoc.data().credits : 0;
                    let newCredits = currentCredits + commentCredits;

                    db.collection("users").doc(userId).update({ credits: newCredits })
                        .then(() => {
                            alert(`✅ Comment confirmed! You earned ${commentCredits} credits.`);
                            window.location.href = "index.html"; // ✅ Redirect to dashboard
                        }).catch(error => {
                            console.error("❌ Error updating credits:", error);
                        });

                }).catch(error => {
                    console.error("❌ Error fetching user credits:", error);
                });

            }).catch(error => {
                console.error("❌ Error recording comment:", error);
            });
        }
    }).catch(error => {
        console.error("❌ Error checking comment history:", error);
    });
}

