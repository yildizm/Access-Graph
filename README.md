# Access Graph

Analyze Google Drive permissions using Neo4j graph database.

## Features

- Scan Google Drive folders and files
- Track user permissions
- Detect security risks (public files, broken inheritance)
- Statistics dashboard
- Interactive file browser

## Setup

### Prerequisites

- Node.js 20+
- Neo4j database
- Google Cloud Project with OAuth 2.0

### Installation

Clone and install:

```bash
git clone <your-repo-url>
cd access-graph
npm install
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `http://localhost:3000/api/auth/callback`

### Neo4j Setup

1. Sign up at [Neo4j Aura](https://neo4j.com/cloud/aura/)
2. Create a database
3. Save your credentials

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Neo4j Credentials
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Google API Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

## Usage

1. Sign in with Google
2. Start a scan (full drive or specific folder)
3. View dashboard for statistics and risks
4. Browse files and analyze user access

## Neo4j Queries

### Count all nodes and relationships
```cypher
MATCH (f:File)
WITH count(f) as files
MATCH (u:User)
WITH files, count(u) as users
MATCH ()-[p:HAS_PERMISSION]->()
RETURN files, users, count(p) as permissions
```

### Folder structure
```cypher
MATCH (root:File)
WHERE NOT (root)<-[:CONTAINS]-(:File)
MATCH path = (root)-[:CONTAINS*1..2]->(child)
RETURN path
LIMIT 50
```

### Most shared files
```cypher
MATCH (u:User)-[:HAS_PERMISSION]->(f:File)
WITH f, count(u) as userCount
RETURN f.name, userCount
ORDER BY userCount DESC
LIMIT 10
```

### Users with most access
```cypher
MATCH (u:User)-[:HAS_PERMISSION]->(f:File)
WITH u, count(f) as fileCount
RETURN u.email, u.type, fileCount
ORDER BY fileCount DESC
LIMIT 10
```

### Public files
```cypher
MATCH (u:User {type: 'anyone'})-[p:HAS_PERMISSION]->(f:File)
RETURN f.name, f.webViewLink, p.role
```

### Permission inheritance
```cypher
MATCH (parent:File)-[:CONTAINS]->(child:File)
MATCH (u:User)-[p:HAS_PERMISSION]->(child)
RETURN parent.name, child.name, u.email, p.role, p.inherited
LIMIT 20
```

### Broken inheritance
```cypher
MATCH (root:File)
WHERE NOT (root)<-[:CONTAINS]-(:File)
MATCH (root)-[:CONTAINS]->(topFolder:File)
MATCH (topFolder)-[:CONTAINS*]->(child:File)
WITH topFolder, child
MATCH (childUser:User)-[:HAS_PERMISSION]->(child)
WITH topFolder, child, collect(DISTINCT childUser.email) as childUsers
OPTIONAL MATCH (topUser:User)-[:HAS_PERMISSION]->(topFolder)
WITH topFolder, child, childUsers, collect(DISTINCT topUser.email) as topUsers
WITH topFolder, child, [user IN childUsers WHERE NOT user IN topUsers] as extraUsers
WHERE size(extraUsers) > 0
RETURN topFolder.name, child.name, extraUsers
LIMIT 10
```

### Domain sharing
```cypher
MATCH (u:User {type: 'domain'})-[:HAS_PERMISSION]->(f:File)
RETURN u.email as domain, f.name, count(*) as fileCount
```

### Delete all data in Neo4j
```cypher
MATCH (n) DETACH DELETE n
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Mantine UI
- **Backend**: Next.js API Routes
- **Database**: Neo4j (graph database)
- **Authentication**: NextAuth.js with Google OAuth
- **APIs**: Google Drive API

## Deployment

Use Vercel:

```bash
npm i -g vercel
vercel
```

Update for production:
- Add environment variables in Vercel dashboard
- Set `NEXTAUTH_URL` to your domain
- Update `GOOGLE_REDIRECT_URI` to `https://your-domain.com/api/auth/callback`
- Add production callback URL in Google Cloud Console

## Security

- `.env.local` is in `.gitignore`
- Rotate secrets if exposed
- Protect Neo4j with strong password

## License

MIT
