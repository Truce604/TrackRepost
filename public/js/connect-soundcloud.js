document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("soundcloud-form");
  const status = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "🔍 Fetching profile...";

    const profileUrl = form.soundcloudUrl.value.trim();
    const match = profileUrl.match(/soundcloud\.com\/([^\/\s]+)/);

    if (!match) {
      status.textContent = "❌ Invalid SoundCloud URL.";
      return;
    }

    const handle = match[1];
    const profilePage = `https://soundcloud.com/${handle}`;

    try {
      const response = await fetch(profilePage);
      const html = await response.text();

      // ✅ Extract profile info
      const displayNameMatch = html.match(/<title>([^<]+)\s*\| Listen/);
      const bioMatch = html.match(/<meta name="description" content="([^"]+)"/);
      const followersMatch = html.match(/([0-9,.]+)\s+followers/i);

      const displayName = displayNameMatch ? displayNameMatch[1].trim() : handle;
      const bio = bioMatch ? bioMatch[1].trim() : "No bio found";
      const followers = followersMatch ? parseInt(followersMatch[1].replace(/[,\.]/g, '')) : 0;

      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          status.textContent = "❌ You must be logged in.";
          return;
        }

        await firebase.firestore().collection("users").doc(user.uid).set({
          soundcloud: {
            handle,
            url: profileUrl,
            displayName,
            bio,
            followers
          }
        }, { merge: true });

        status.textContent = `✅ Connected to @${handle} with ${followers} followers!`;
      });
    } catch (err) {
      console.error("Profile fetch error:", err);
      status.textContent = "❌ Failed to fetch profile data.";
    }
  });
});
