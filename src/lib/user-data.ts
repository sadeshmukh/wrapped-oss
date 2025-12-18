import { Client, Databases, ID, Query } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);

const DB_ID = process.env.APPWRITE_DATABASE_ID || "wrappeddb";
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || "waitlist";
const GLOBAL_STATS_COLLECTION_ID =
  process.env.APPWRITE_GLOBAL_STATS_COLLECTION_ID || "globalstats";

export async function updateGlobalStats(
  userId: string,
  messageCount: number
): Promise<void> {
  try {
    const userRes = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (userRes.documents.length === 0) return;
    const userDoc = userRes.documents[0];

    let globalStatsID = userDoc.globalStatsID;

    if (!globalStatsID) {
      globalStatsID = ID.unique();
      await databases.updateDocument(DB_ID, COLLECTION_ID, userDoc.$id, {
        globalStatsID,
      });
    }

    const statsRes = await databases.listDocuments(
      DB_ID,
      GLOBAL_STATS_COLLECTION_ID,
      [Query.equal("OriginID", globalStatsID)]
    );

    if (statsRes.documents.length === 0) {
      await databases.createDocument(
        DB_ID,
        GLOBAL_STATS_COLLECTION_ID,
        ID.unique(),
        {
          OriginID: globalStatsID,
          messagecount: String(messageCount),
        }
      );
    }
  } catch (e) {
    console.error("Error updating global stats", e);
  }
}

export async function removeUser(userId: string): Promise<void> {
  try {
    const existing = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (existing.total > 0) {
      const doc = existing.documents[0];

      await databases.deleteDocument(DB_ID, COLLECTION_ID, doc.$id);

      if (doc.globalStatsID) {
        try {
          const statsRes = await databases.listDocuments(
            DB_ID,
            GLOBAL_STATS_COLLECTION_ID,
            [Query.equal("OriginID", doc.globalStatsID)]
          );

          if (statsRes.total > 0) {
            await databases.deleteDocument(
              DB_ID,
              GLOBAL_STATS_COLLECTION_ID,
              statsRes.documents[0].$id
            );
          }
        } catch (e) {
          console.error("Error deleting global stats:", e);
        }
      }
    }
  } catch (error) {
    console.error("Appwrite error removing user:", error);
  }
}

export async function getUserData(userId: string): Promise<any | null> {
  try {
    const existing = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (existing.total > 0) {
      const doc = existing.documents[0];
      if (doc.data) {
        return JSON.parse(doc.data);
      }
    }
    return null;
  } catch (error) {
    console.error("Appwrite error getting user data:", error);
    return null;
  }
}

export async function generateUploadSecret(
  userId: string
): Promise<string | null> {
  try {
    const secret = ID.unique();
    const existing = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (existing.total > 0) {
      const doc = existing.documents[0];
      await databases.updateDocument(DB_ID, COLLECTION_ID, doc.$id, {
        uploadSecret: secret,
      });
      return secret;
    } else {
      await databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
        userId,
        slackUserId: userId,
        token: "",
        uploadSecret: secret,
        status: "pending_upload",
        addedAt: new Date().toISOString(),
      });
      return secret;
    }
  } catch (error) {
    console.error("Error generating upload secret:", error);
    return null;
  }
}

export async function processUpload(
  secret: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("uploadSecret", secret),
    ]);

    if (existing.total === 0) {
      return { success: false, error: "Invalid secret" };
    }

    const doc = existing.documents[0];
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    const updateData: any = {
      status: "completed",
      data: JSON.stringify(parsedData),
      uploadSecret: null,
    };

    if (parsedData.userName) {
      updateData.githubUsername = parsedData.userName;
    }

    await databases.updateDocument(DB_ID, COLLECTION_ID, doc.$id, updateData);

    return { success: true };
  } catch (error) {
    console.error("Error processing upload:", error);
    return { success: false, error: "Internal error" };
  }
}
