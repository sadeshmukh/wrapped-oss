require("dotenv").config({ path: ".env.local" });
const { Client, Databases } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = "wrappeddb";
const USER_DATA_COLLECTION_ID = "waitlist";
const PUBLIC_WRAPPED_COLLECTION_ID = "publicwrappeds";
const GLOBAL_STATS_COLLECTION_ID = "globalstats";

async function setup() {
  console.log("Starting Appwrite Schema Setup...");

  try {
    console.log(`Checking attributes for ${USER_DATA_COLLECTION_ID}...`);
    const userDataAttributes = [
      { key: "userId", type: "string", size: 255, required: true },
      { key: "slackUserId", type: "string", size: 255, required: true },
      { key: "token", type: "string", size: 1024, required: false }, // backwards compat

      { key: "status", type: "string", size: 50, required: true },
      { key: "addedAt", type: "string", size: 50, required: true },

      { key: "githubUsername", type: "string", size: 255, required: false },
      { key: "data", type: "string", size: 1000000, required: false },
      { key: "uploadSecret", type: "string", size: 255, required: false },
      { key: "globalStatsID", type: "string", size: 255, required: false },
    ];

    for (const attr of userDataAttributes) {
      try {
        await databases.createStringAttribute(
          DB_ID,
          USER_DATA_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required,
          attr.default
        );
        console.log(`Created attribute ${attr.key}`);
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        if (e.code === 409) {
          console.log(`Attribute ${attr.key} already exists.`);
        } else {
          console.error(`Error creating attribute ${attr.key}:`, e);
        }
      }
    }

    console.log(`Checking indexes for ${USER_DATA_COLLECTION_ID}...`);
    const userDataIndexes = [
      { key: "idx_status", type: "key", attributes: ["status"] },
      { key: "idx_userId", type: "key", attributes: ["userId"] },
      { key: "idx_uploadSecret", type: "key", attributes: ["uploadSecret"] },
    ];

    for (const idx of userDataIndexes) {
      try {
        await databases.createIndex(
          DB_ID,
          USER_DATA_COLLECTION_ID,
          idx.key,
          idx.type,
          idx.attributes
        );
        console.log(`Created index ${idx.key}`);
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        if (e.code === 409) {
          console.log(`Index ${idx.key} already exists.`);
        } else {
          console.error(`Error creating index ${idx.key}:`, e);
        }
      }
    }

    console.log(`Checking attributes for ${PUBLIC_WRAPPED_COLLECTION_ID}...`);
    const shareAttributes = [
      { key: "userId", type: "string", size: 255, required: true },
      { key: "publicId", type: "string", size: 255, required: true },
      { key: "content", type: "string", size: 1000000, required: true },
      { key: "createdAt", type: "string", size: 50, required: true },
    ];

    for (const attr of shareAttributes) {
      try {
        await databases.createStringAttribute(
          DB_ID,
          PUBLIC_WRAPPED_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required
        );
        console.log(`Created attribute ${attr.key}`);
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        if (e.code === 409) {
          console.log(`Attribute ${attr.key} already exists.`);
        } else {
          console.error(`Error creating attribute ${attr.key}:`, e);
        }
      }
    }

    const shareIndexes = [
      { key: "idx_userId", type: "key", attributes: ["userId"] },
      { key: "idx_publicId", type: "key", attributes: ["publicId"] },
    ];

    for (const idx of shareIndexes) {
      try {
        await databases.createIndex(
          DB_ID,
          PUBLIC_WRAPPED_COLLECTION_ID,
          idx.key,
          idx.type,
          idx.attributes
        );
        console.log(`Created index ${idx.key}`);
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        if (e.code === 409) {
          console.log(`Index ${idx.key} already exists.`);
        } else {
          console.error(`Error creating index ${idx.key}:`, e);
        }
      }
    }

    console.log(`Checking attributes for ${GLOBAL_STATS_COLLECTION_ID}...`);
    const globalStatsAttributes = [
      { key: "OriginID", type: "string", size: 255, required: true },
      { key: "messagecount", type: "string", size: 255, required: true },
    ];

    for (const attr of globalStatsAttributes) {
      try {
        await databases.createStringAttribute(
          DB_ID,
          GLOBAL_STATS_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required
        );
        console.log(`Created attribute ${attr.key}`);
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        if (e.code === 409) {
          console.log(`Attribute ${attr.key} already exists.`);
        } else {
          console.error(`Error creating attribute ${attr.key}:`, e);
        }
      }
    }

    const globalStatsIndexes = [
      { key: "idx_OriginID", type: "key", attributes: ["OriginID"] },
    ];

    for (const idx of globalStatsIndexes) {
      try {
        await databases.createIndex(
          DB_ID,
          GLOBAL_STATS_COLLECTION_ID,
          idx.key,
          idx.type,
          idx.attributes
        );
        console.log(`Created index ${idx.key}`);
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        if (e.code === 409) {
          console.log(`Index ${idx.key} already exists.`);
        } else {
          console.error(`Error creating index ${idx.key}:`, e);
        }
      }
    }

    console.log("Setup Complete!");
  } catch (error) {
    console.error("Setup failed:", error);
  }
}

setup();
