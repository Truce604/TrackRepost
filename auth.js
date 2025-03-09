
// ✅ Ensure Firebase is Loaded
if (typeof firebase === "undefined") {
    console.error("🚨 Firebase failed to load! Check if Firebase scripts are included in index.html.");
} else {
    console.log("✅ Firebase Loaded Successfully!");

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ✅ Enable Firestore Offline Mode for Faster Performance
    db.enablePersistence()
        .then(() => console.log("✅ Firestore offline mode enabled"))
        .catch(error => console.warn("⚠️ Firestore persistence error:", error));

    // ✅ Set Firebase Auth Persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log("✅ Auth Persistence Set to LOCAL");
        })
        .catch(error => {
            console.error("❌ Error setting auth persistence:", error.message);
        });

    // ✅ LISTEN FOR AUTH CHANGES WITH SESSION CHECK
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("✅ User detected:", user.email);
            updateDashboard(user);
            loadActiveCampaigns(); // ✅ Ensure campaigns load when user logs in
        } else {
            console.warn("🚨 No user detected.");
            updateDashboard(null);
        }
    });

    // ✅ LOAD ACTIVE CAMPAIGNS FUNCTION (Removed 'Unknown Track' placeholder)
    window.loadActiveCampaigns = function () {
        const campaignsDiv = document.getElementById("activeCampaigns");
        if (!campaignsDiv) {
            console.error("❌ Campaigns section not found");
            return;
        }

        campaignsDiv.innerHTML = "<p>Loading...</p>";

        db.collection("campaigns").get()
            .then(async (querySnapshot) => {
                console.log(`🔍 Found ${querySnapshot.size} campaigns in Firestore`);
                campaignsDiv.innerHTML = "";

                if (querySnapshot.empty) {
                    campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
                } else {
                    for (const doc of querySnapshot.docs) {
                        let data = doc.data();
                        console.log("🎵 Campaign Data:", data);

                        campaignsDiv.innerHTML += `
                            <div id="campaign-${doc.id}">
                                <iframe loading="lazy" width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                                </iframe>
                                <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.credits}', '${data.track}')">Repost</button>
                            </div>
                        `;
                    }
                }
            })
            .catch(error => console.error("❌ Error loading campaigns:", error));
    };

    // ✅ CONNECT TO SOUNDCLOUD
    window.connectSoundCloud = function () {
        const clientId = "YOUR_SOUNDCLOUD_CLIENT_ID";
        const redirectUri = encodeURIComponent(window.location.href);
        window.location.href = `https://soundcloud.com/connect?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}`;
    };

    window.extractSoundCloudToken = function () {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        if (accessToken) {
            localStorage.setItem("soundcloud_access_token", accessToken);
            console.log("✅ SoundCloud Access Token Stored!");
            alert("✅ SoundCloud Account Connected!");
        }
    };

    window.onload = function () {
        extractSoundCloudToken();
    };

    // ✅ REPOST TRACK TO SOUNDCLOUD
    window.repostTrack = async function (campaignId, campaignOwner, campaignCredits, trackUrl) {
        const user = auth.currentUser;
        if (!user) {
            alert("❌ You must be logged in to repost.");
            return;
        }

        if (user.uid === campaignOwner) {
            alert("❌ You cannot repost your own campaign.");
            return;
        }

        let accessToken = localStorage.getItem("soundcloud_access_token");
        if (!accessToken) {
            alert("❌ You need to connect your SoundCloud account.");
            connectSoundCloud();
            return;
        }

        let trackId;
        try {
            let response = await fetch(`https://api.soundcloud.com/resolve?url=${trackUrl}&client_id=YOUR_SOUNDCLOUD_CLIENT_ID`);
            let trackData = await response.json();
            trackId = trackData.id;
        } catch (error) {
            console.error("❌ Error fetching SoundCloud track ID:", error);
            alert("❌ Failed to find track on SoundCloud.");
            return;
        }

        try {
            let repostResponse = await fetch(`https://api.soundcloud.com/me/favorites/${trackId}?oauth_token=${accessToken}`, {
                method: "PUT"
            });

            if (repostResponse.ok) {
                alert("✅ Track reposted successfully!");
            } else {
                alert("❌ Failed to repost track on SoundCloud.");
            }
        } catch (error) {
            console.error("❌ Error reposting track:", error);
            alert(error.message);
        }
    };
}



