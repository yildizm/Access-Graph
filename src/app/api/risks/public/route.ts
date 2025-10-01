import driver from '@/lib/neo4j';
import { NextResponse } from 'next/server';

export interface PublicFile {
  id: string;
  name: string;
  owner: string;
  webViewLink: string;
}

export async function GET() {
  const session = driver.session({ database: 'neo4j' });

  try {
    const cypherQuery = `
      MATCH (f:File)
      WHERE (f)<-[:HAS_PERMISSION]-(:User {type: 'anyone'})
      RETURN f.id as id, f.name as name, f.owner as owner, f.webViewLink as webViewLink
      LIMIT 100
    `;

    const result = await session.run(cypherQuery);

    const files: PublicFile[] = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      owner: record.get('owner'),
      webViewLink: record.get('webViewLink'),
    }));

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching public files:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching data.' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}