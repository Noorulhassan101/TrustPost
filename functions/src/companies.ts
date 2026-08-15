import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createCompany = onCall(async (request) => {
    // 1. Verify authentication
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "User must be logged in to create a company.");
    }
    const uid = request.auth.uid;
    const { name, country, currency } = request.data;

    if (!name || !country || !currency) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const db = admin.firestore();

    // 2. Security Guard: Reject if the user already has a companyId
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists && userDoc.data()?.companyId) {
        throw new HttpsError("already-exists", "User is already associated with a company.");
    }

    // 3. Create the company
    const newCompanyRef = db.collection("companies").doc();
    const companyId = newCompanyRef.id;

    const batch = db.batch();

    // Schema Initialization
    batch.set(newCompanyRef, {
        name,
        country,
        currency,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        docsProcessedThisMonth: 0,
        monthlyDocCap: 500
    });

    // 4. Create the member link subcollection
    const memberRef = newCompanyRef.collection("members").doc(uid);
    batch.set(memberRef, {
        role: "admin"
    });

    // 5. Link company to user profile
    batch.set(userRef, {
        email: request.auth.token.email || "",
        companyId,
        createdAt: userDoc.exists && userDoc.data()?.createdAt ? userDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    return { success: true, companyId };
});
