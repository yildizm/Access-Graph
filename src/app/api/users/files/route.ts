import driver from '@/lib/neo4j';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  const neo4jSession = driver.session({ database: 'neo4j' });
  try {
    const cypherQuery = `
      MATCH (u:User {email: $email})-[r:HAS_PERMISSION]->(f:File)
      RETURN
        f.id as id,
        f.name as name,
        f.webViewLink as webViewLink,
        r.role as role
      ORDER BY f.name
    `;
    const result = await neo4jSession.run(cypherQuery, { email });

    const files = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      webViewLink: record.get('webViewLink'),
      role: record.get('role'),
    }));

    return NextResponse.json(files);
  } finally {
    await neo4jSession.close();
  }
}
