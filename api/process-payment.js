
import { Client, Environment } from "square";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const squareClient = new Client({
    environment: Environment.Production,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { token, amount, userId } = req.body;
        const creditsToAdd = creditPackages[amount] || 0;

        if (creditsToAdd === 0) {
            return res.status(400).json({ error: "Invalid amount selected" });
        }

        const response = await squareClient.paymentsApi.createPayment({
            sourceId: token,
            amountMoney: {
                amount: amount * 100,
                currency: "USD",
            },
            idempotencyKey: new Date().getTime().toString(),
        });

        // ✅ Update user credits in Firestore
        const userRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
            return res.status(404).json({ error: "User not found" });
        }

        const userData = userSnapshot.data();
        const newCredits = (userData.credits || 0) + creditsToAdd;

        await updateDoc(userRef, { credits: newCredits });

        res.json({ success: true, credits: newCredits });

    } catch (error) {
        console.error("❌ Square Payment Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}
