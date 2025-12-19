# HC Wrapped 2025

A "Wrapped" style site for Hack Club members to see their year in review!!!!

It grabs data from Slack, Hackatime and the YSWS db to make a cool slideshow summary of your year in Hack Club.

## Local CLI

If you don't want to use `npx wrapped-cli` to upload your data, you can run it manually.

```bash
git clone https://github.com/sadeshmukh/wrapped.git
cd wrapped/cli
npm i && npm run start
```

## Features

- **Slack Integration**
- **Waitlist** (to avoid the garbage rate limits Slack has)
- **Data** (wow!)
  - Total messages sent
  - Top channels
  - DM statistics
  - Confessions & meta messages
  - YSWS projects submitted
  - Hackatime stats
- **Shareable Summary** (lets you take a ss at the end)

## Tech Stack

- Next.js
- TypeScript
- Tailwind
- Appwrite
- Slack API, Wakatime API
- Framer Motion

## Getting Started

### Prerequisites

- Node.js (v20 or later recommended)
- pnpm
- A Slack App (and preferrably a bunch more, lol) with appropriate permissions
- An Appwrite project

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd wrapped
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Environment Setup:**

   Add this to a `.env.local` file:

   ```env
   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret

   APPWRITE_API_KEY=your_appwrite_api_key
   ```

## Appwrite Configuration

The following environment variables are required for Appwrite integration:

- `APPWRITE_ENDPOINT`: Your Appwrite endpoint (e.g., `https://cloud.appwrite.io/v1`)
- `APPWRITE_PROJECT_ID`: Your Appwrite project ID
- `APPWRITE_API_KEY`: An Appwrite API key with `documents.read` and `documents.write` scopes
- `APPWRITE_DATABASE_ID`: The ID of your Appwrite database
- `APPWRITE_COLLECTION_ID`: The ID of the collection for user data
- `APPWRITE_GLOBAL_STATS_COLLECTION_ID`: The ID of the collection for global statistics
- `APPWRITE_PUBLIC_WRAPPEDS_COLLECTION_ID`: The ID of the collection for public shared wrappeds

4. **Run the dev server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
