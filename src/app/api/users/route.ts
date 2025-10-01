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
      MATCH (u:User)-[r:HAS_PERMISSION]->(f:File)
      RETURN DISTINCT
        u.email as email,
        u.type as type,
        count(DISTINCT f) as fileCount
      ORDER BY fileCount DESC
    `;
    const result = await neo4jSession.run(cypherQuery);

    const users = result.records.map(record => ({
      email: record.get('email'),
      type: record.get('type'),
      fileCount: record.get('fileCount').toNumber(),
    }));

    return NextResponse.json(users);
  } finally {
    await neo4jSession.close();
  }
}
