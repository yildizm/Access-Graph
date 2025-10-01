import driver from '@/lib/neo4j';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const neo4jSession = driver.session({ database: 'neo4j' });
  try {
    const cypherQuery = `
      MATCH (root:File)
      WHERE NOT (root)<-[:CONTAINS]-(:File)
      MATCH (root)-[:CONTAINS]->(topFolder:File)
      MATCH (topFolder)-[:CONTAINS*]->(child:File)

      WITH topFolder, child
      MATCH (childUser:User)-[:HAS_PERMISSION]->(child)
      WITH topFolder, child, collect(DISTINCT childUser.email) as childUsers

      OPTIONAL MATCH (topUser:User)-[:HAS_PERMISSION]->(topFolder)
      WITH topFolder, child, childUsers, collect(DISTINCT topUser.email) as topUsers

      WITH topFolder, child, childUsers, topUsers,
           [user IN childUsers WHERE NOT user IN topUsers] as extraUsers
      WHERE size(extraUsers) > 0

      UNWIND extraUsers as extraUser
      RETURN DISTINCT
        child.name as name,
        child.webViewLink as link,
        extraUser as extraUser,
        topFolder.name as parentName,
        topFolder.name as topLevelFolder
      LIMIT 100
    `;
    const result = await neo4jSession.run(cypherQuery);

    const findings = result.records.map(record => record.toObject());
    return NextResponse.json(findings);
  } finally {
    await neo4jSession.close();
  }
}