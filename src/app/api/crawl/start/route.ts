import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { runCrawler } from '@/lib/google-drive-crawler';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions); 
  
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  let folderName = body.folderName || null;

  if (folderName && folderName.toLowerCase() === 'root') {
    folderName = null;
  }

  try {
    const result = await runCrawler(session.accessToken, folderName);
    if (!result.success) {
        throw new Error(result.error || 'The crawler encountered an unspecified error.');
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}