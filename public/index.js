// ✅ Ensure Firebase is loaded before running scripts 
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check index.html script imports.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

// ✅ Firebase Authentication and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Firebase Auth State Listener (Checks if user is logged in)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        document.getElementById("logoutBtn").style.display = "block";
        document.getElementById("authMessage").innerText = `✅ Logged in as ${user.email}`;
        
        // Load credits
        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            document.getElementById("userCredits").innerText = `💰 ${userDoc.data().credits} Credits`;
        }

        // Load campaigns
        loadActiveCampaigns();
    } else {
        console.warn("🚨 No user is logged in.");
        document.getElementById("authMessage").innerText = "❌ Not logged in";
        document.getElementById("logoutBtn").style.display = "none";
    }
});

// ✅ Load Active Campaigns from Firestore
function loadActiveCampaigns() {
    console.log("🔄 Loading campaigns...");

    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found.");
        return;
    }

    db.collection("campaigns").get()
        .then(querySnapshot => {
            campaignsDiv.innerHTML = "";

            if (querySnapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            } else {
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <a href="repost.html?campaignId=${doc.id}&trackUrl=${encodeURIComponent(data.track)}">
                                <button>Repost & Earn ${data.credits} Credits</button>
                            </a>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading active campaigns:", error);
        });
}

// ✅ Attach Event Listeners
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Page Loaded Successfully!");

    // ✅ Attach Authentication Listeners
    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});
