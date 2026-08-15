/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from "firebase-admin";
import * as fft from "firebase-functions-test";
import { createCompany } from "../src/companies";

const testEnv = fft({
    projectId: "demo-entryai-test",
});

// Point Admin SDK to Firestore Emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

describe("createCompany Firebase Function", () => {
    let db: admin.firestore.Firestore;

    beforeAll(() => {
        if (admin.apps.length === 0) {
            admin.initializeApp({ projectId: "demo-entryai-test" });
        }
        db = admin.firestore();
    });

    afterAll(() => {
        testEnv.cleanup();
    });

    beforeEach(async () => {
        // Clear all data in the emulator before each test
        await fetch(`http://127.0.0.1:8080/emulator/v1/projects/demo-entryai-test/databases/(default)/documents`, {
            method: 'DELETE',
        });
    });

    it("should reject unauthenticated requests", async () => {
        const wrapped = testEnv.wrap(createCompany);
        await expect(wrapped({ data: {} } as any))
            .rejects.toThrow("User must be logged in");
    });

    it("should require necessary fields provided by payload", async () => {
        const wrapped = testEnv.wrap(createCompany);
        const auth = { uid: "user123", token: { email: "test@example.com" } };
        await expect(wrapped({ data: {}, auth } as any))
            .rejects.toThrow("Missing required fields.");
    });

    it("should create a company with correct quotas, member link, and user profile updates", async () => {
        const wrapped = testEnv.wrap(createCompany);
        const data = { name: "Test Corp", country: "US", currency: "USD" };
        const auth = { uid: "user123", token: { email: "test@example.com" } };

        const result = await wrapped({ data, auth } as any);
        expect(result.success).toBe(true);
        expect(result.companyId).toBeDefined();

        // Verify company data and quotas (Schema Init)
        const companyDoc = await db.collection("companies").doc(result.companyId).get();
        expect(companyDoc.exists).toBe(true);
        expect(companyDoc.data()?.docsProcessedThisMonth).toBe(0);
        expect(companyDoc.data()?.monthlyDocCap).toBe(500);
        expect(companyDoc.data()?.country).toBe("US");

        // Verify member link created inside subcollection
        const memberDoc = await db.collection(`companies/${result.companyId}/members`).doc("user123").get();
        expect(memberDoc.exists).toBe(true);
        expect(memberDoc.data()?.role).toBe("admin");

        // Verify user profile link exists
        const userDoc = await db.collection("users").doc("user123").get();
        expect(userDoc.exists).toBe(true);
        expect(userDoc.data()?.companyId).toBe(result.companyId);
        expect(userDoc.data()?.email).toBe("test@example.com");
    });

    it("should reject explicit creation if user already has a company", async () => {
        const wrapped = testEnv.wrap(createCompany);
        const auth = { uid: "user123", token: { email: "test@example.com" } };

        // First successful request
        await wrapped({ data: { name: "First Corp", country: "US", currency: "USD" }, auth } as any);

        // Second request should fail by security guard
        const data2 = { name: "Second Corp", country: "PK", currency: "PKR" };
        await expect(wrapped({ data: data2, auth } as any))
            .rejects.toThrow("User is already associated with a company.");
    });
});
