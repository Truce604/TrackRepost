document.addEventListener("DOMContentLoaded", () => {
  const statusBox = document.getElementById("status");

  // Parse the `code` param from SoundCloud
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (!code) {
    statusBox.textContent = "❌ Missing authorization code from SoundCloud.";
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      statusBox.textContent = "❌ You must be logged in to finish connecting your SoundCloud account.";
      return;
    }

    try {
      const response = await fetch("/api/soundcloud/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, uid: user.uid }),
      });

      const result = await response.json();

      if (response.ok) {
        statusBox.textContent = "✅ SoundCloud account connected!";
        setTimeout(() => {
          window.location.href = "/dashboard.html";
        }, 1500);
      } else {
        console.error(result);
        statusBox.textContent = "❌ Connection failed. Please try again.";
      }
    } catch (err) {
      console.error(err);
      statusBox.textContent = "❌ Something went wrong.";
    }
  });
});

