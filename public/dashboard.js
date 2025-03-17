// ✅ Ensure Firebase is loaded before running scripts
if (!window.auth || !window.db) {
    console.error("🚨 Firebase is not properly initialized! Check firebaseConfig.js.");
} else {
    console.log("✅ Firebase Loaded Successfully!");
}

const auth = window.auth;
const db = window.db;

// ✅ Load User Data on Auth Change
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`✅ User logged in: ${user.email}`);
        document.getElementById("userEmail").textContent = user.email;
        document.getElementById("logoutBtn").style.display = "inline-block";

        // ✅ Load User Credits & Transaction History
        loadUserCredits(user.uid);
        loadTransactionHistory(user.uid);
    } else {
        console.warn("🚨 No user is logged in.");
        window.location.href = "index.html"; // Redirect to login page
    }
});

// ✅ Load User Credits
function loadUserCredits(userId) {
    db.collection("users").doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const credits = doc.data().credits || 0;
                document.getElementById("userCredits").textContent = credits;
                console.log(`✅ User credits loaded: ${credits}`);
            } else {
                console.warn("🚨 User document not found.");
            }
        })
        .catch(error => {
            console.error("❌ Error loading user credits:", error);
        });
}

// ✅ Load Transaction History
function loadTransactionHistory(userId) {
    db.collection("transactions")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get()
        .then(querySnapshot => {
            const tableBody = document.getElementById("transactionHistory");
            tableBody.innerHTML = "";

            if (querySnapshot.empty) {
                tableBody.innerHTML = "<tr><td colspan='4'>No transactions found.</td></tr>";
            } else {
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const date = new Date(data.timestamp.toDate()).toLocaleString();

                    tableBody.innerHTML += `
                        <tr>
                            <td>${data.type}</td>
                            <td>${data.trackTitle || "N/A"}</td>
                            <td>${data.credits}</td>
                            <td>${date}</td>
                        </tr>
                    `;
                });
            }
        })
        .catch(error => {
            console.error("❌ Error loading transaction history:", error);
        });
}

// ✅ Log Out User
document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.signOut()
        .then(() => {
            console.log("✅ User logged out successfully.");
            window.location.href = "index.html";
        })
        .catch(error => {
            console.error("❌ Logout Error:", error);
        });
});

