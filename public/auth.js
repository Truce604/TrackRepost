
window.repostTrack = async function (campaignId, ownerId, credits) {
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

        // ✅ Fetch user followers to determine credit value
        const userDoc = await userRef.get();
        let followers = userDoc.data()?.followers || 0;
        let creditsEarned = Math.max(1, Math.floor(followers / 100)); // 100 followers = 1 credit

        // ✅ Update Firestore with repost
        await db.runTransaction(async (transaction) => {
            transaction.set(repostRef, {
                userId: user.uid,
                campaignId: campaignId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(creditsEarned)
            });

            transaction.update(campaignRef, {
                credits: firebase.firestore.FieldValue.increment(-creditsEarned)
            });
        });

        alert(`✅ Repost Successful! You earned ${creditsEarned} credits.`);
    } catch (error) {
        console.error("❌ Error reposting:", error);
        alert(`❌ Error: ${error.message}`);
    }
};


