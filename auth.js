// ✅ ADD This to `auth.js`
window.submitTrack = async function () {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit a track.");
        return;
    }

    const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
    if (!soundcloudUrl) {
        alert("Please enter a valid SoundCloud URL.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    try {
        await userRef.update({
            trackUrl: soundcloudUrl
        });

        document.getElementById("currentTrackMessage").innerText = "Your submitted track: " + soundcloudUrl;
        alert("✅ Track submitted successfully!");

    } catch (error) {
        console.error("Error submitting track:", error);
        alert("❌ Error submitting track. Please try again.");
    }
};

// ✅ Load the user's track when they log in
auth.onAuthStateChanged((user) => {
    if (user) {
        const userRef = db.collection("users").doc(user.uid);
        userRef.get().then((doc) => {
            if (doc.exists && doc.data().trackUrl) {
                document.getElementById("currentTrackMessage").innerText = "Your submitted track: " + doc.data().trackUrl;
            }
        }).catch(error => console.error("Error fetching track data:", error));
    }
});
