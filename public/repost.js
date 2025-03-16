function repostTrack(campaignId, trackUrl, credits, artistId) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to earn credits.");
        return;
    }

    const userId = user.uid;
    let extraCredits = 0; // Track additional credits earned

    db.collection("reposts").doc(`${campaignId}_${userId}`).get().then(doc => {
        if (doc.exists) {
            alert("⚠️ You have already reposted this track.");
        } else {
            // ✅ Repost the track
            db.collection("reposts").doc(`${campaignId}_${userId}`).set({
                userId: userId,
                campaignId: campaignId,
                timestamp: new Date(),
                creditsEarned: credits
            }).then(() => {
                console.log(`✅ Repost confirmed for user: ${userId}`);

                // ✅ UI for Additional Actions
                document.getElementById("interactionSection").innerHTML = `
                    <p>✅ Repost Successful! Now earn extra credits:</p>
                    <input type="checkbox" id="likeTrack" checked> 👍 Like the track (+1 Credit) <br>
                    <input type="checkbox" id="followArtist" checked> 🔥 Follow the artist (+2 Credits) <br>
                    <button onclick="confirmActions('${campaignId}', '${userId}', '${artistId}', ${credits})">Confirm</button>
                `;
            });
        }
    }).catch(error => console.error("❌ Error checking repost history:", error));
}

// ✅ Confirm Actions (Like, Follow, Comment)
function confirmActions(campaignId, userId, artistId, baseCredits) {
    let totalCredits = baseCredits;
    let likeChecked = document.getElementById("likeTrack").checked;
    let followChecked = document.getElementById("followArtist").checked;

    if (likeChecked) totalCredits += 1; // Add 1 credit for liking
    if (followChecked) totalCredits += 2; // Add 2 credits for following

    db.collection("users").doc(userId).get().then(userDoc => {
        let currentCredits = userDoc.exists ? userDoc.data().credits : 0;
        let newCredits = currentCredits + totalCredits;

        db.collection("users").doc(userId).update({ credits: newCredits })
            .then(() => {
                alert(`✅ Actions confirmed! You earned ${totalCredits} credits.`);
                
                // ✅ Show "Leave a Comment" Button
                document.getElementById("interactionSection").innerHTML = `
                    <p>💬 Want more credits? Leave a comment!</p>
                    <button onclick="window.location.href='comment.html?campaign=${campaignId}'">
                        ✍️ Comment & Earn 2 More Credits
                    </button>
                `;
            }).catch(error => console.error("❌ Error updating credits:", error));
    }).catch(error => console.error("❌ Error fetching user credits:", error));
}

