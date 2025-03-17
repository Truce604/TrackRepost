// ✅ Ensure Firebase is loaded before running scripts
if (!window.auth || !window.db) {
    console.error("🚨 Firebase is not properly initialized! Check firebaseConfig.js.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

const auth = window.auth;
const db = window.db;

// ✅ Load Repost Campaign
function loadRepostCampaign() {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get("id");

    if (!campaignId) {
        console.error("🚨 No campaign ID provided!");
        document.getElementById("campaignDetails").innerHTML = "<p>Campaign not found.</p>";
        return;
    }

    console.log(`🔄 Loading campaign: ${campaignId}`);

    db.collection("campaigns").doc(campaignId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const trackUrl = encodeURIComponent(data.track);
                const campaignOwner = data.owner;
                const baseCredits = data.credits || 1;

                document.getElementById("campaignDetails").innerHTML = `
                    <h3>🔥 Now Promoting:</h3>
                    <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                        src="https://w.soundcloud.com/player/?url=${trackUrl}">
                    </iframe>
                    <button onclick="attemptRepost('${campaignId}', '${campaignOwner}', ${baseCredits})">
                        Repost & Earn ${baseCredits} Credits
                    </button>
                `;

            } else {
                console.warn("🚨 Campaign not found.");
                document.getElementById("campaignDetails").innerHTML = "<p>Campaign not found.</p>";
            }
        })
        .catch(error => {
            console.error("❌ Error loading campaign:", error);
        });
}

// ✅ Attempt to Repost a Track
function attemptRepost(campaignId, campaignOwner, baseCredits) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    console.log(`🔄 Attempting to repost campaign ${campaignId}`);

    // ✅ Check if user has already reposted this campaign
    db.collection("reposts").where("userId", "==", user.uid).where("campaignId", "==", campaignId)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                alert("🚨 You have already reposted this track.");
                return;
            }

            // ✅ Fetch user followers count to calculate correct credits
            db.collection("users").doc(user.uid).get()
                .then(doc => {
                    if (!doc.exists) {
                        alert("🚨 User data not found.");
                        return;
                    }

                    const followers = doc.data().followers || 100; // Default to 100 followers if unknown
                    const earnedCredits = Math.floor(followers / 100) || 1;

                    console.log(`✅ Calculated Credits: ${earnedCredits}`);

                    // ✅ Save repost to Firestore
                    db.collection("reposts").add({
                        userId: user.uid,
                        campaignId: campaignId,
                        earnedCredits: earnedCredits,
                        timestamp: new Date()
                    }).then(() => {
                        console.log("✅ Repost saved successfully!");

                        // ✅ Update user's credits
                        db.collection("users").doc(user.uid).update({
                            credits: firebase.firestore.FieldValue.increment(earnedCredits)
                        }).then(() => {
                            alert(`🎉 Success! You earned ${earnedCredits} credits.`);
                            window.location.href = `comment.html?id=${campaignId}`;
                        });

                    }).catch(error => {
                        console.error("❌ Error saving repost:", error);
                    });

                }).catch(error => {
                    console.error("❌ Error fetching user data:", error);
                });

        })
        .catch(error => {
            console.error("❌ Error checking repost history:", error);
        });
}

// ✅ Ensure Page Loads & Functions are Attached
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Repost Page Loaded Successfully!");
    loadRepostCampaign();
});

