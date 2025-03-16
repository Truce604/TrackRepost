// ✅ Firebase Setup
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Repost Track Function
async function repostTrack(campaignId, trackUrl, credits, artistId) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    // ✅ Check if user already reposted this track
    const repostRef = db.collection("reposts").doc(`${campaignId}_${user.uid}`);
    const repostSnap = await repostRef.get();
    
    if (repostSnap.exists) {
        alert("⚠️ You've already reposted this track. No duplicate reposts allowed.");
        return;
    }

    // ✅ Save repost action to Firestore
    await repostRef.set({
        userId: user.uid,
        campaignId,
        trackUrl,
        credits: parseInt(credits),
        timestamp: new Date()
    });

    // ✅ Update User Credits
    const userRef = db.collection("users").doc(user.uid);
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(parseInt(credits))
    });

    document.getElementById("repostStatus").innerHTML = `✅ Reposted Successfully! You earned ${credits} credits.`;

    // ✅ Show Interaction Options (Like & Follow)
    document.getElementById("interactionSection").style.display = "block";
}

// ✅ Confirm Like & Follow Actions
async function confirmActions() {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in.");
        return;
    }

    let extraCredits = 0;
    if (document.getElementById("likeTrack").checked) extraCredits += 1;
    if (document.getElementById("followArtist").checked) extraCredits += 2;

    if (extraCredits > 0) {
        const userRef = db.collection("users").doc(user.uid);
        await userRef.update({
            credits: firebase.firestore.FieldValue.increment(extraCredits)
        });

        alert(`🎉 You earned an extra ${extraCredits} credits!`);
    }

    // ✅ Show Comment Section
    document.getElementById("commentSection").style.display = "block";
}

