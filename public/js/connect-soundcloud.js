// public/js/connect-soundcloud.js

const connectButton = document.getElementById("connectSoundCloud");
const statusBox = document.getElementById("status");

const CLIENT_ID = "YOUR_SOUNDCLOUD_CLIENT_ID";
const REDIRECT_URI = "https://www.trackrepost.com/soundcloud-callback"; // This must be set in SoundCloud app settings

connectButton.addEventListener("click", () => {
  const authUrl = `https://soundcloud.com/connect?client_id=${CLIENT_ID}` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&response_type=code&scope=non-expiring`;

  window.location.href = authUrl;
});