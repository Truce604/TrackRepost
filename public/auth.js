// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
window.loadActiveCampaigns = function () {
    console.log("🔄 Loading campaigns...");
    const campaignsDiv = document.getElementById("activeCampaigns");

    if (!campaignsDiv) {
        console.error("❌ Campaigns section not found.");
        return;
    }

    campaignsDiv.innerHTML = "<p>⏳ Loading campaigns...</p>";

    db.collection("campaigns").orderBy("timestamp", "desc").get()
        .then(snapshot => {
            campaignsDiv.innerHTML = ""; // Clear existing content

            if (snapshot.empty) {
                campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            } else {
                snapshot.forEach(doc => {
                    let data = doc.data();
                    campaignsDiv.innerHTML += `
                        <div class="campaign">
                            <h3>🔥 Now Promoting:</h3>
                            <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                                src="https://w.soundcloud.com/player/?url=${encodeURIComponent(data.track)}">
                            </iframe>
                            <button onclick="repostTrack('${doc.id}', '${data.owner}', '${data.track}')">🔄 Repost & Earn Credits</button>
                            <button onclick="likeTrack('${data.track}')">❤️ Like Track</button>
                            <button onclick="followUser('${data.owner}')">🔔 Follow Artist</button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading campaigns:", error);
            campaignsDiv.innerHTML = "<p>⚠️ Failed to load campaigns. Check console.</p>";
        });
};

// ✅ AUTOLOAD CAMPAIGNS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    if (typeof loadActiveCampaigns === "function") {
        loadActiveCampaigns();
    } else {
        console.error("🚨 loadActiveCampaigns function is missing!");
    }
});

