// ✅ Ensure Firebase is loaded before running scripts
if (!window.auth || !window.db) {
    console.error("🚨 Firebase is not properly initialized! Check firebaseConfig.js.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

const auth = window.auth;
const db = window.db;

// ✅ Load Comment Page Campaign
function loadCommentCampaign() {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get("id");

    if (!campaignId) {
        console.error("🚨 No campaign ID provided!");
        document.getElementById("trackContainer").innerHTML = "<p>Track not found.</p>";
        return;
    }

    console.log(`🔄 Loading campaign: ${campaignId}`);

    db.collection("campaigns").doc(campaignId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const trackUrl = encodeURIComponent(data.track);
                const campaignOwner = data.owner;

                document.getElementById("trackContainer").innerHTML = `
                    <h3>🔥 Now Playing:</h3>
                    <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                        src="https://w.soundcloud.com/player/?url=${trackUrl}">
                    </iframe>
                `;

                // ✅ Attach button listeners
                document.getElementById("submitComment").addEventListener("click", () => submitComment(campaignId));
                document.getElementById("likeTrack").addEventListener("click", () => likeTrack(campaignId));
                document.getElementById("followUser").addEventListener("click", () => followArtist(campaignId, campaignOwner));

            } else {
                console.warn("🚨 Campaign not found.");
                document.getElementById("trackContainer").innerHTML = "<p>Track not found.</p>";
            }
        })
        .catch(error => {
            console.error("❌ Error loading campaign:", error);
        });
}

// ✅ Submit Comment & Earn 2 Credits
function submitComment(campaignId) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to comment.");
        return;
    }

    const commentText = document.getElementById("commentText").value.trim();
    if (!commentText) {
        alert("🚨 Comment cannot be empty.");
        return;
    }

    db.collection("comments").add({
        userId: user.uid,
        campaignId: campaignId,
        comment: commentText,
        timestamp: new Date()
    }).then(() => {
        console.log("✅ Comment saved successfully!");

        // ✅ Update user's credits
        db.collection("users").doc(user.uid).update({
            credits: firebase.firestore.FieldValue.increment(2)
        }).then(() => {
            alert("🎉 Success! You earned 2 credits for commenting.");
        });

    }).catch(error => {
        console.error("❌ Error submitting comment:", error);
    });
}

// ✅ Like Track & Earn 1 Credit
function likeTrack(campaignId) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to like.");
        return;
    }

    db.collection("likes").add({
        userId: user.uid,
        campaignId: campaignId,
        timestamp: new Date()
    }).then(() => {
        console.log("✅ Like saved successfully!");

        // ✅ Update user's credits
        db.collection("users").doc(user.uid).update({
            credits: firebase.firestore.FieldValue.increment(1)
        }).then(() => {
            alert("🎉 Success! You earned 1 credit for liking.");
        });

    }).catch(error => {
        console.error("❌ Error liking track:", error);
    });
}

// ✅ Follow Artist & Earn 2 Credits
function followArtist(campaignId, campaignOwner) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to follow.");
        return;
    }

    db.collection("follows").add({
        userId: user.uid,
        followedUser: campaignOwner,
        timestamp: new Date()
    }).then(() => {
        console.log("✅ Follow saved successfully!");

        // ✅ Update user's credits
        db.collection("users").doc(user.uid).update({
            credits: firebase.firestore.FieldValue.increment(2)
        }).then(() => {
            alert("🎉 Success! You earned 2 credits for following.");
        });

    }).catch(error => {
        console.error("❌ Error following artist:", error);
    });
}

// ✅ Ensure Page Loads & Functions are Attached
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Comment Page Loaded Successfully!");
    loadCommentCampaign();
});


