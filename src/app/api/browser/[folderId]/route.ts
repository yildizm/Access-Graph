import driver from '@/lib/neo4j';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { folderId } = await params;
  const neo4jSession = driver.session({ database: 'neo4j' });

  try {
    let cypherQuery: string;

    if (folderId === 'root') {
      cypherQuery = `
        MATCH (root:File)
        WHERE NOT (root)<-[:CONTAINS]-(:File)
        MATCH (root)-[:CONTAINS]->(child:File)
        OPTIONAL MATCH (grantee:User)-[p:HAS_PERMISSION]->(child)
        RETURN
          child.id as id,
          child.name as name,
          EXISTS((child)-[:CONTAINS]->()) as isFolder,
          collect({ type: grantee.type, email: grantee.email, role: p.role }) AS permissions
      `;
    } else {
      cypherQuery = `
        MATCH (parent:File {id: $folderId})
        MATCH (parent)-[:CONTAINS]->(child:File)
        OPTIONAL MATCH (grantee:User)-[p:HAS_PERMISSION]->(child)
        RETURN
          child.id as id,
          child.name as name,
          EXISTS((child)-[:CONTAINS]->()) as isFolder,
          collect({ type: grantee.type, email: grantee.email, role: p.role }) AS permissions
      `;
    }

    const result = await neo4jSession.run(cypherQuery, { folderId });

    const items = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      isFolder: record.get('isFolder'),
      permissions: record.get('permissions').filter(p => p.role !== null),
    }));

    const folders = items.filter(item => item.isFolder);
    const files = items.filter(item => !item.isFolder);
    
    return NextResponse.json({ folders, files });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'An error occurred while querying the database.' }, { status: 500 });
  } finally {
    await neo4jSession.close();
  }
}