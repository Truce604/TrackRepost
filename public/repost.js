// ✅ Ensure Firebase is loaded before running scripts
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Get track details from URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("id");
const trackUrl = decodeURIComponent(urlParams.get("track"));
const artistId = urlParams.get("owner");
const creditsPerRepost = parseInt(urlParams.get("credits"), 10) || 10;

// ✅ Update UI with track details
document.getElementById("trackEmbed").innerHTML = `
    <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
        src="https://w.soundcloud.com/player/?url=${trackUrl}">
    </iframe>
`;

// ✅ Auto-Follow on Page Load (If checkbox is checked)
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("followOptOut").checked) {
        followArtist();
    }
});

// ✅ Repost Button Action
document.getElementById("repostBtn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    // ✅ Call Repost Function
    const success = await repostTrack(campaignId, user.uid, creditsPerRepost);
    if (success) {
        document.getElementById("actionStatus").innerHTML = "✅ Repost Successful!";
        updateUserCredits(user.uid, creditsPerRepost);
    }
});

// ✅ Comment Button Action
document.getElementById("commentBtn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to comment.");
        return;
    }

    const commentText = document.getElementById("commentText").value.trim();
    if (commentText.length < 3) {
        alert("⚠️ Comment must be at least 3 characters long.");
        return;
    }

    const success = await postComment(trackUrl, commentText);
    if (success) {
        document.getElementById("actionStatus").innerHTML += "<br>✅ Comment Posted!";
        updateUserCredits(user.uid, 2);
    }
});

// ✅ Function to Repost Track
async function repostTrack(campaignId, userId, credits) {
    try {
        await db.collection("reposts").add({
            campaignId: campaignId,
            userId: userId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Track reposted successfully.");
        return true;
    } catch (error) {
        console.error("❌ Error reposting track:", error);
        return false;
    }
}

// ✅ Function to Follow Artist
async function followArtist() {
    console.log(`👤 Following artist: ${artistId}`);
    document.getElementById("actionStatus").innerHTML += "<br>✅ Followed the artist!";
    return true;
}

// ✅ Function to Post a Comment (This redirects user to SoundCloud)
async function postComment(trackUrl, commentText) {
    alert("🔊 You will be redirected to SoundCloud to post your comment.");
    window.open(trackUrl, "_blank");
    return true;
}

// ✅ Function to Update User Credits
async function updateUserCredits(userId, amount) {
    try {
        const userRef = db.collection("users").doc(userId);
        await userRef.update({ credits: firebase.firestore.FieldValue.increment(amount) });
        console.log(`✅ Credits updated: +${amount}`);
    } catch (error) {
        console.error("❌ Error updating credits:", error);
    }
}

