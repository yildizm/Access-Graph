'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Title, Card, Loader, Text, Anchor, Group, Breadcrumbs, Avatar, Tooltip, Button } from '@mantine/core';
import { IconFolder, IconFileText, IconUsers, IconWorld, IconBuilding, IconHome} from '@tabler/icons-react';
import Link from 'next/link';

interface Permission { email: string; role: string; }
interface FileItem { id: string; name: string; permissions: Permission[]; }
interface FolderItem extends FileItem {}

const PermissionIcons = ({ permissions }: { permissions: Permission[] }) => {
  const isPublic = permissions.some(p => p.type === 'anyone');
  const isDomain = permissions.some(p => p.type === 'domain');
  const userShares = permissions.filter(p => p.type === 'user');

  if (permissions.length === 0) {
    return <Text size="xs" color="dimmed">Private</Text>;
  }

  return (
    <Group spacing="xs" sx={{ flexWrap: 'nowrap' }}>
      {isPublic && (
        <Tooltip label="Publicly shared">
          <Avatar radius="xl" size="sm" color="red"><IconWorld size={14} /></Avatar>
        </Tooltip>
      )}
      {isDomain && (
        <Tooltip label="Shared with a domain">
          <Avatar radius="xl" size="sm" color="orange"><IconBuilding size={14} /></Avatar>
        </Tooltip>
      )}
      {userShares.slice(0, 2).map((share, index) => (
        <Tooltip key={index} label={`${share.email} (${share.role})`}>
          <Avatar radius="xl" size="sm">
            {share.email.substring(0, 2).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
      {userShares.length > 2 && (
        <Tooltip label={`${userShares.length - 2} more users`}>
            <Avatar radius="xl" size="sm">+{userShares.length - 2}</Avatar>
        </Tooltip>
      )}
    </Group>
  );
};

export default function BrowserPage() {
  const { status } = useSession();
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [path, setPath] = useState([{ id: 'root', name: 'My Drive' }]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoading(true);
      setError(null);
      fetch(`/api/browser/${currentFolderId}`)
        .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch data')))
        .then(data => {
          setFolders(data.folders);
          setFiles(data.files);
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [currentFolderId, status]);

  const handleFolderClick = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setPath([...path, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (folderId: string, index: number) => {
    setCurrentFolderId(folderId);
    setPath(path.slice(0, index + 1));
  };
  
  const breadcrumbItems = path.map((item, index) => (
    <Anchor href="#" onClick={() => handleBreadcrumbClick(item.id, index)} key={item.id}>
      {item.name}
    </Anchor>
  ));

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <Group justify="space-between" mb="md">
        <Title>File & Permission Browser</Title>
        <Link href="/dashboard">
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Breadcrumbs mb="md">{breadcrumbItems}</Breadcrumbs>
        {isLoading ? (
          <Loader />
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : (
          <>
            {folders.map(folder => (
              <Group key={folder.id} position="apart" my="sm" style={{ cursor: 'pointer' }} onClick={() => handleFolderClick(folder)}>
                <Group><IconFolder size={20} /><Text>{folder.name}</Text></Group>
                <PermissionIcons permissions={folder.permissions} />
              </Group>
            ))}
            {files.map(file => (
              <Group key={file.id} position="apart" my="sm">
                <Group><IconFileText size={20} /><Text>{file.name}</Text></Group>
                <PermissionIcons permissions={file.permissions} />
              </Group>
            ))}
          </>
        )}
      </Card>
    </main>
  );
}