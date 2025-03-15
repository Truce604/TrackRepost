// ✅ Repost a Track (Manual Process)
function repostTrack(campaignId, ownerId, credits) {
    alert("🔊 You must repost manually. You will be redirected to SoundCloud.");
    
    // Get campaign track URL
    db.collection("campaigns").doc(campaignId).get()
        .then(doc => {
            if (doc.exists) {
                const trackUrl = doc.data().track;
                
                // Open the SoundCloud track in a new tab
                window.open(trackUrl, "_blank");

                // Show confirmation message
                setTimeout(() => {
                    let confirmRepost = confirm("Did you repost this track on SoundCloud?");
                    if (confirmRepost) {
                        awardCreditsToUser(credits, campaignId);
                    } else {
                        alert("❌ You must repost the track to earn credits.");
                    }
                }, 5000); // Wait 5 seconds before confirming
            } else {
                console.error("❌ Campaign not found.");
                alert("Error: Campaign not found.");
            }
        })
        .catch(error => {
            console.error("❌ Error fetching campaign:", error);
            alert("Error: Could not fetch campaign details.");
        });
}

// ✅ Award Credits After Repost Confirmation
function awardCreditsToUser(credits, campaignId) {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to receive credits.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    db.runTransaction(transaction => {
        return transaction.get(userRef).then(userDoc => {
            if (!userDoc.exists) {
                throw "User not found!";
            }
            let newCredits = (userDoc.data().credits || 0) + credits;
            transaction.update(userRef, { credits: newCredits });

            alert(`✅ You earned ${credits} credits!`);
        });
    }).catch(error => {
        console.error("❌ Error awarding credits:", error);
        alert("Error: Could not award credits.");
    });
}

