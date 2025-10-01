import { google } from 'googleapis';
import driver from './neo4j';

const FOLDERS_TO_SKIP = ['Personal'];

export async function runCrawler(accessToken: string, folderName?: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  let startFolderId = 'root';

  if (folderName) {
    console.log(`Searching for folder named: "${folderName}"`);
    const foundFolderId = await getFolderIdByName(drive, folderName);
    if (!foundFolderId) throw new Error(`Folder "${folderName}" not found.`);
    startFolderId = foundFolderId;
  }
  
  console.log(`Starting crawl from folder ID: ${startFolderId}`);
  const allItems = await crawlFolder(drive, startFolderId);
  
  if (allItems.length > 0) {
    await writeToGraph(allItems);
  }

  console.log(`Crawl complete! Found and processed ${allItems.length} items.`);
  return { success: true, count: allItems.length };
}

async function crawlFolder(drive, folderId: string) {
  let allItems: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, owners, webViewLink, parents, permissions, mimeType)',
      pageSize: 200,
      pageToken: pageToken,
    });

    const items = res.data.files || [];
    if (items.length > 0) {
      const filteredItems = items.filter(item => {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          return !FOLDERS_TO_SKIP.includes(item.name!);
        }
        return true;
      });

      allItems.push(...filteredItems);

      const subfolders = filteredItems.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
      for (const subfolder of subfolders) {
        const subfolderItems = await crawlFolder(drive, subfolder.id!);
        allItems.push(...subfolderItems);
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return allItems;
}

async function writeToGraph(files: any[]) {
  const session = driver.session({ database: 'neo4j' });
  try {
    const filesData = files.map(file => ({
      id: file.id,
      name: file.name,
      owner: file.owners?.[0]?.emailAddress ?? 'unknown',
      webViewLink: file.webViewLink,
      mimeType: file.mimeType,
      parents: file.parents ?? [],
      permissions: file.permissions ?? []
    }));

    const cypherQuery = `
      UNWIND $files as fileData
      MERGE (f:File {id: fileData.id})
      SET f.name = fileData.name,
          f.owner = fileData.owner,
          f.webViewLink = fileData.webViewLink,
          f.mimeType = fileData.mimeType
      
      WITH f, fileData
      WHERE size(fileData.parents) > 0
      UNWIND fileData.parents as parentId
      WITH f, fileData, parentId
      WHERE parentId IS NOT NULL

      MERGE (p:File {id: parentId})
      MERGE (p)-[:CONTAINS]->(f)

      WITH f, fileData
      WHERE size(fileData.permissions) > 0
      UNWIND fileData.permissions as perm
      WITH f, fileData, perm
      WHERE perm.id IS NOT NULL
      MERGE (u:User {id: perm.id, email: COALESCE(perm.emailAddress, perm.domain, 'anyone')})
      SET u.type = perm.type
      MERGE (u)-[r:HAS_PERMISSION]->(f)
      SET r.role = perm.role, r.inherited = perm.inherited
    `;

    await session.run(cypherQuery, { files: filesData });
    console.log(`Successfully wrote ${files.length} files and their permissions to the graph.`);
  } catch (error) {
    console.error("Error in writeToGraph:", error);
    throw error;
  } finally {
    await session.close();
  }
}