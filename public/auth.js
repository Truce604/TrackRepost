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
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        syncDisplayName(user); // Ensure display name is saved in Firestore
        updateDashboard(user);
        loadActiveCampaigns(); // Reload campaigns after login
    } else {
        console.warn("🚨 No user is logged in.");
        updateDashboard(null);
    }
});

// ✅ Ensure Display Name is Synced to Firestore
function syncDisplayName(user) {
    if (!user) return;

    const userRef = db.collection("users").doc(user.uid);
    userRef.get().then(docSnapshot => {
        if (!docSnapshot.exists || !docSnapshot.data().displayName) {
            userRef.set({
                email: user.email,
                credits: 0,
                reposts: 0,
                displayName: user.displayName || "User"
            }, { merge: true });
            console.log(`✅ Synced display name: ${user.displayName}`);
        }
    }).catch(error => console.error("❌ Error syncing display name:", error));
}

// ✅ Update User Dashboard
function updateDashboard(user) {
    const dashboard = document.getElementById("userDashboard");

    if (!dashboard) {
        console.error("❌ Dashboard element not found.");
        return;
    }

    if (!user) {
        dashboard.innerHTML = `<h2>You are not logged in.</h2><p>Please log in or sign up.</p>`;
        return;
    }

    dashboard.innerHTML = `<h2>Welcome, ${user.displayName || user.email}!</h2>`;
}

// ✅ Sign Up a New User (With Display Name)
function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const displayName = document.getElementById("displayName").value; // New input for display name

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;

            // ✅ Update Firebase Authentication Profile with Display Name
            return user.updateProfile({
                displayName: displayName
            }).then(() => {
                // ✅ Store User in Firestore
                return db.collection("users").doc(user.uid).set({
                    email: user.email,
                    credits: 0,
                    reposts: 0,
                    displayName: displayName
                }, { merge: true });
            }).then(() => {
                console.log(`✅ User signed up: ${user.email} (Display Name: ${displayName})`);
                updateDashboard(user);
            });
        })
        .catch(error => {
            console.error("❌ Signup Error:", error);
            alert(`Signup Error: ${error.message}`);
        });
}

// ✅ Log In an Existing User (Ensures Display Name is Synced)
function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            syncDisplayName(user); // Ensure display name is stored in Firestore
            console.log(`✅ User logged in: ${user.email}`);
            updateDashboard(user);
        })
        .catch(error => {
            console.error("❌ Login Error:", error);
            alert(`Login Error: ${error.message}`);
        });
}

// ✅ Log Out the Current User
function logoutUser() {
    auth.signOut()
        .then(() => {
            console.log("✅ User logged out successfully.");
            updateDashboard(null);
        })
        .catch(error => {
            console.error("❌ Logout Error:", error);
        });
}

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

                    let estimatedCredits = Math.max(1, Math.floor(100 / 100)) + 3; // Example, adjust dynamically

                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="redirectToRepostPage('${doc.id}', '${data.track}')">
                                Repost & Earn ${estimatedCredits} Credits
                            </button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading active campaigns:", error);
        });
}

// ✅ Redirect to Repost Page
function redirectToRepostPage(campaignId, trackUrl) {
    window.location.href = `repost.html?campaignId=${campaignId}&trackUrl=${encodeURIComponent(trackUrl)}`;
}

// ✅ Function to handle reposting
async function repostTrack(campaignId) {
    if (!auth.currentUser) {
        alert("🚨 You must be logged in to repost.");
        return;
    }

    const userRef = db.collection("users").doc(auth.currentUser.uid);
    const campaignRef = db.collection("campaigns").doc(campaignId);

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            alert("❌ User data not found.");
            return;
        }
        const userData = userDoc.data();
        const followerCount = userData.followers || 100; // Default to 100 followers if not set

        let earnedCredits = Math.max(1, Math.floor(followerCount / 100));
        earnedCredits += 1; // +1 credit for liking
        earnedCredits += 2; // +2 credits for commenting

        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists || campaignDoc.data().creditsRemaining < earnedCredits) {
            alert("⚠️ Not enough credits left in this campaign.");
            return;
        }

        await db.runTransaction(async (transaction) => {
            const updatedCampaign = await transaction.get(campaignRef);
            const updatedUser = await transaction.get(userRef);

            if (!updatedCampaign.exists || !updatedUser.exists) return;

            transaction.update(campaignRef, {
                creditsRemaining: updatedCampaign.data().creditsRemaining - earnedCredits,
                repostCount: (updatedCampaign.data().repostCount || 0) + 1
            });

            transaction.update(userRef, {
                credits: (updatedUser.data().credits || 0) + earnedCredits
            });
        });

        alert(`✅ Repost successful! You earned ${earnedCredits} credits.`);
    } catch (error) {
        console.error("❌ Error reposting:", error);
    }
}

// ✅ Ensure Page Loads & Functions are Attached
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();

    document.getElementById("signupBtn").addEventListener("click", signupUser);
    document.getElementById("loginBtn").addEventListener("click", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});

