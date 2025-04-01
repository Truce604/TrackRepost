document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");

  const auth = firebase.auth();
  const db = firebase.firestore();
  const provider = new firebase.auth.GoogleAuthProvider();

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        const userRef = db.collection("users").doc(user.uid);
        const docSnap = await userRef.get();

        if (!docSnap.exists) {
          await userRef.set({
            email: user.email,
            credits: 30,
            createdAt: new Date().toISOString(),
          });
        }

        window.location.reload();
      } catch (err) {
        console.error("Login failed:", err);
        alert("Login failed. Please try again.");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await auth.signOut();
      window.location.reload();
    });
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      if (userInfo) {
        userInfo.innerHTML = `<p>Welcome, ${user.displayName || user.email}</p>`;
      }
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
      if (loginBtn) loginBtn.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  });
});

