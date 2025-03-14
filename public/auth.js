// auth.js

// ✅ Import necessary Firebase services
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc 
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig'; // Ensure firebaseConfig.js properly exports `auth` & `db`

// ✅ Firebase Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log(`✅ User is logged in: ${user.email}`);
        updateDashboard(user);
        loadActiveCampaigns(); // Reload campaigns after login
    } else {
        console.warn("🚨 No user is logged in.");
        updateDashboard(null);
    }
});

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

    dashboard.innerHTML = `<h2>Welcome, ${user.email}!</h2>`;
}

// ✅ Sign Up a New User
export async function signupUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log(`✅ User signed up: ${userCredential.user.email}`);
        updateDashboard(userCredential.user);
    } catch (error) {
        console.error("❌ Signup Error:", error);
        alert(`Signup Error: ${error.message}`);
    }
}

// ✅ Log In an Existing User
export async function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log(`✅ User logged in: ${userCredential.user.email}`);
        updateDashboard(userCredential.user);
    } catch (error) {
        console.error("❌ Login Error:", error);
        alert(`Login Error: ${error.message}`);
    }
}

// ✅ Log Out the Current User
export async function logoutUser() {
    try {
        await signOut(auth);
        console.log("✅ User logged out successfully.");
        updateDashboard(null);
    } catch (error) {
        console.error("❌ Logout Error:", error);
    }
}

// ✅ Load Active Campaigns from Firestore
export async function loadActiveCampaigns() {
    console.log("🔄 Loading campaigns...");

    const campaignsDiv = document.getElementById("activeCampaigns");
    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found.");
        return;
    }

    try {
        const campaignsQuery = query(collection(db, "campaigns"));
        const querySnapshot = await getDocs(campaignsQuery);

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
                        <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}')">
                            Repost & Earn ${data.credits} Credits
                        </button>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("❌ Error loading active campaigns:", error);
    }
}

// ✅ Submit a New Track
export async function submitTrack() {
    const user = auth.currentUser;
    if (!user) {
        alert("🚨 You must be logged in to submit a track.");
        return;
    }

    const soundcloudUrl = document.getElementById("soundcloudUrl").value.trim();
    if (!soundcloudUrl.includes("soundcloud.com/")) {
        alert("🚨 Invalid SoundCloud URL.");
        return;
    }

    try {
        await addDoc(collection(db, "campaigns"), {
            owner: user.uid,
            track: soundcloudUrl,
            credits: 10,
            timestamp: new Date()
        });

        alert("✅ Track successfully submitted!");
        loadActiveCampaigns();
    } catch (error) {
        console.error("❌ Error submitting track:", error);
        alert(`Error submitting track: ${error.message}`);
    }
}

// ✅ Repost a Track (Placeholder)
export async function repostTrack(campaignId, ownerId, credits) {
    alert(`🚨 You must be signed into SoundCloud to repost this track.`);
    console.log(`Attempting to repost campaign ${campaignId}`);
}

// ✅ SoundCloud Authentication (Placeholder)
export async function loginWithSoundCloud() {
    alert("🔊 Redirecting to SoundCloud login...");
    window.location.href = "https://soundcloud.com/connect"; // Replace with actual OAuth login when implemented
}

// ✅ Ensure Page Loads & Functions are Attached
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Page Loaded Successfully!");
    loadActiveCampaigns();
});


