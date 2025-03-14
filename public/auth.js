
// ✅ FUNCTION: LOAD ACTIVE CAMPAIGNS
window.loadActiveCampaigns = function () {
    console.log("🔄 Loading campaigns...");
    const campaignsDiv = document.getElementById("activeCampaigns");

    if (!campaignsDiv) {
        console.error("❌ Campaigns container not found in DOM.");
        return;
    }

    campaignsDiv.innerHTML = "<p>⏳ Loading campaigns...</p>";

    db.collection("campaigns").orderBy("timestamp", "desc").onSnapshot(snapshot => {
        campaignsDiv.innerHTML = "";  // Clear before adding new

        if (snapshot.empty) {
            campaignsDiv.innerHTML = "<p>No active campaigns available.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const trackUrl = data.track;
            const campaignId = doc.id;

            campaignsDiv.innerHTML += `
                <div class="campaign">
                    <h3>🔥 Now Promoting:</h3>
                    <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
                        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}">
                    </iframe>
                    <button onclick="repostTrack('${campaignId}', '${data.owner}', '${data.credits}')">
                        Repost & Earn ${data.credits} Credits
                    </button>
                </div>
            `;
        });
    }, error => {
        console.error("❌ Error loading campaigns:", error);
    });
};

// ✅ Ensure Campaigns Load on Page Load
document.addEventListener("DOMContentLoaded", () => {
    loadActiveCampaigns();
});
