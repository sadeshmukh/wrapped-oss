import { Client, Databases, ID, Query } from "node-appwrite";
import { WrappedData } from "@/types/wrapped";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);

const DB_ID = process.env.APPWRITE_DATABASE_ID || "wrappeddb";
const COLLECTION_ID =
  process.env.APPWRITE_PUBLIC_WRAPPEDS_COLLECTION_ID || "publicwrappeds";

export async function createShare(
  userId: string,
  data: WrappedData
): Promise<string | null> {
  try {
    const existing = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (existing.total > 0) {
      const doc = existing.documents[0];
      await databases.updateDocument(DB_ID, COLLECTION_ID, doc.$id, {
        content: JSON.stringify(data),
      });
      return doc.publicId;
    }

    const publicId = ID.unique();
    await databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
      userId,
      publicId,
      content: JSON.stringify(data),
      createdAt: new Date().toISOString(),
    });

    return publicId;
  } catch (error) {
    console.error("Error creating share:", error);
    return null;
  }
}

export async function getShareByUserId(userId: string): Promise<string | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (res.total > 0) {
      return res.documents[0].publicId;
    }
    return null;
  } catch (error) {
    console.error("Error getting share:", error);
    return null;
  }
}

export async function getShareByPublicId(
  publicId: string
): Promise<WrappedData | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("publicId", publicId),
    ]);

    if (res.total > 0) {
      const doc = res.documents[0];
      return JSON.parse(doc.content);
    }
    return null;
  } catch (error) {
    console.error("Error getting shared wrapped:", error);
    return null;
  }
}

export async function deleteShare(userId: string): Promise<boolean> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (res.total > 0) {
      await databases.deleteDocument(
        DB_ID,
        COLLECTION_ID,
        res.documents[0].$id
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting share:", error);
    return false;
  }
}
