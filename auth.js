window.repostTrack = async function () {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to repost and earn credits.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    try {
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            alert("User data not found. Please sign up again.");
            return;
        }

        let userData = userDoc.data();
        let newReposts = (userData.reposts || 0) + 1;
        let newCredits = (userData.credits || 0) + 10; // Earn 10 credits per repost

        await userRef.update({
            reposts: newReposts,
            credits: newCredits
        });

        document.getElementById("repostCount").innerText = newReposts;
        document.getElementById("creditCount").innerText = newCredits;

        alert("Repost successful! You earned 10 credits.");

    } catch (error) {
        console.error("Error updating credits:", error);
        alert("Error processing repost. Try again.");
    }
};
