// ✅ Firebase Setup
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Load User Dashboard
auth.onAuthStateChanged(async user => {
    if (!user) {
        alert("🚨 You must be logged in to access the dashboard.");
        window.location.href = "index.html";
        return;
    }

    console.log(`✅ Logged in as ${user.email}`);

    // ✅ Fetch User Credits
    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
        document.getElementById("creditBalance").innerText = `💰 ${userSnap.data().credits} Credits`;
    } else {
        document.getElementById("creditBalance").innerText = "⚠️ No credits found.";
    }

    // ✅ Fetch User Running Campaigns
    const campaignRef = db.collection("campaigns").where("owner", "==", user.uid);
    const campaignSnap = await campaignRef.get();

    const campaignDiv = document.getElementById("runningCampaigns");
    campaignDiv.innerHTML = "";

    if (campaignSnap.empty) {
        campaignDiv.innerHTML = "<p>No active campaigns.</p>";
    } else {
        campaignSnap.forEach(doc => {
            const data = doc.data();
            campaignDiv.innerHTML += `
                <div class="campaign">
                    <h3>🔥 ${data.track}</h3>
                    <p>Remaining Credits: ${data.credits}</p>
                </div>
            `;
        });
    }
});
