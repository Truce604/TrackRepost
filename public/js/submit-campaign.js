form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusBox.textContent = "Submitting...";

  const trackUrl = form.trackUrl.value.trim();
  const genre = genreInput.value.trim();
  const credits = parseInt(form.credits.value); // ✅ get input value

  if (!trackUrl || !genre || isNaN(credits) || credits < 1) {
    statusBox.textContent = "❌ All fields are required and credits must be 1 or more.";
    return;
  }

  try {
    const campaignRef = doc(db, "campaigns", `${user.uid}_${Date.now()}`);
    await setDoc(campaignRef, {
      userId: user.uid,
      trackUrl,
      genre,
      credits, // ✅ now dynamic
      createdAt: new Date().toISOString()
    });

    statusBox.textContent = "✅ Campaign submitted!";
    form.reset();
    genreInput.value = "";
  } catch (err) {
    console.error("Error submitting campaign:", err);
    statusBox.textContent = "❌ Failed to submit campaign.";
  }
});







