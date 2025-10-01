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
      MATCH (f:File)
      WITH count(f) as totalFiles,
           sum(CASE WHEN EXISTS((f)-[:CONTAINS]->()) THEN 1 ELSE 0 END) as folderCount
      MATCH (u:User)
      WITH totalFiles, folderCount, count(u) as userCount
      MATCH ()-[p:HAS_PERMISSION]->()
      RETURN
        totalFiles,
        folderCount,
        totalFiles - folderCount as fileCount,
        userCount,
        count(p) as permissionCount
    `;
    const result = await neo4jSession.run(cypherQuery);

    if (result.records.length === 0) {
      return NextResponse.json({
        totalFiles: 0,
        folderCount: 0,
        fileCount: 0,
        userCount: 0,
        permissionCount: 0,
      });
    }

    const record = result.records[0];
    const stats = {
      totalFiles: record.get('totalFiles').toNumber(),
      folderCount: record.get('folderCount').toNumber(),
      fileCount: record.get('fileCount').toNumber(),
      userCount: record.get('userCount').toNumber(),
      permissionCount: record.get('permissionCount').toNumber(),
    };

    return NextResponse.json(stats);
  } finally {
    await neo4jSession.close();
  }
}
