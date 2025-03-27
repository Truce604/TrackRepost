firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "/login.html";
      return;
    }
  
    const db = firebase.firestore();
    const form = document.getElementById("campaignForm");
    const status = document.getElementById("status");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const trackUrl = document.getElementById("trackUrl").value;
      const genre = document.getElementById("genre").value;
      const credits = parseInt(document.getElementById("credits").value);
  
      try {
        // Get current user credits
        const userRef = db.collection("users").doc(user.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
  
        if (userData.credits < credits) {
          status.textContent = "❌ Not enough credits.";
          return;
        }
  
        // Submit campaign
        await db.collection("campaigns").add({
          userId: user.uid,
          trackUrl,
          genre,
          creditsAssigned: credits,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
  
        // Deduct credits
        await userRef.update({
          credits: firebase.firestore.FieldValue.increment(-credits),
        });
  
        status.textContent = "✅ Campaign submitted!";
        form.reset();
      } catch (err) {
        console.error("Error submitting campaign:", err);
        status.textContent = "❌ Error submitting campaign.";
      }
    });
  });
  