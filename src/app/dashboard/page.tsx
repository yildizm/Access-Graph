'use client';

import { useState, useEffect } from 'react';
import { Accordion, Table, Title, Card, Loader, Text, Anchor, Button, Group, TextInput, SimpleGrid, Switch } from '@mantine/core';
import type { PublicFile } from '../api/risks/public/route';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = localPart.charAt(0) + '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map((part, idx) =>
    idx === domainParts.length - 1 ? part : part.charAt(0) + '***'
  ).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}

function StatisticsCard() {
  const [stats, setStats] = useState<{
    totalFiles: number;
    folderCount: number;
    fileCount: number;
    userCount: number;
    permissionCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/statistics')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch statistics.');
        }
        return res.json();
      })
      .then(data => {
        setStats(data);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
      <Title order={3}>Database Statistics</Title>
      <Text c="dimmed" size="sm" mb="md">
        Overview of files, folders, and users in your drive.
      </Text>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : stats ? (
        <SimpleGrid cols={3} spacing="lg">
          <div>
            <Text size="xl" fw={700}>{stats.totalFiles}</Text>
            <Text size="sm" c="dimmed">Total Files & Folders</Text>
          </div>
          <div>
            <Text size="xl" fw={700}>{stats.folderCount}</Text>
            <Text size="sm" c="dimmed">Folders</Text>
          </div>
          <div>
            <Text size="xl" fw={700}>{stats.fileCount}</Text>
            <Text size="sm" c="dimmed">Files</Text>
          </div>
          <div>
            <Text size="xl" fw={700}>{stats.userCount}</Text>
            <Text size="sm" c="dimmed">Users</Text>
          </div>
          <div>
            <Text size="xl" fw={700}>{stats.permissionCount}</Text>
            <Text size="sm" c="dimmed">Permissions</Text>
          </div>
        </SimpleGrid>
      ) : null}
    </Card>
  );
}

function AllUsersCard({ maskEmails }: { maskEmails: boolean }) {
  const [users, setUsers] = useState<{email: string; type: string; fileCount: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userFiles, setUserFiles] = useState<{id: string; name: string; webViewLink: string; role: string}[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch users data.');
        }
        return res.json();
      })
      .then(data => {
        setUsers(data);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleUserClick = (email: string) => {
    setSelectedUser(email);
    setFilesLoading(true);
    fetch(`/api/users/files?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        setUserFiles(data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setFilesLoading(false);
      });
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
      <Title order={3}>All Users with Access</Title>
      <Text c="dimmed" size="sm" mb="md">
        List of all users who have access to files in your drive. Click to see their files.
      </Text>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : users.length === 0 ? (
        <Text size="sm" color="dimmed">No users found.</Text>
      ) : (
        <>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>Files with Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={i}>
                  <td>
                    <Anchor component="button" onClick={() => handleUserClick(user.email)}>
                      {maskEmails ? maskEmail(user.email) : user.email}
                    </Anchor>
                  </td>
                  <td>{user.type}</td>
                  <td>{user.fileCount}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          {selectedUser && (
            <Card mt="md" withBorder>
              <Title order={4}>Files accessible by {maskEmails ? maskEmail(selectedUser) : selectedUser}</Title>
              {filesLoading ? (
                <Loader size="sm" mt="md" />
              ) : (
                <Table mt="md" fontSize="sm">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Role</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userFiles.map((file) => (
                      <tr key={file.id}>
                        <td>{file.name}</td>
                        <td>{file.role}</td>
                        <td>
                          <Anchor href={file.webViewLink} target="_blank" size="sm">
                            Open
                          </Anchor>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
        </>
      )}
    </Card>
  );
}

function BrokenInheritanceCard({ maskEmails }: { maskEmails: boolean }) {
  const [groupedFindings, setGroupedFindings] = useState<{[key: string]: any[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/risks/broken-inheritance')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch broken inheritance data.');
        }
        return res.json();
      })
      .then(data => {
        const grouped = data.reduce((acc, finding) => {
          const key = finding.topLevelFolder;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(finding);
          return acc;
        }, {});
        setGroupedFindings(grouped);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
      <Title order={3}>Broken Inheritance Risks</Title>
      <Text c="dimmed" size="sm" mb="md">
        Grouped by top-level folder. Click to expand.
      </Text>
      
      {isLoading ? (
        <Loader />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : Object.keys(groupedFindings).length === 0 ? (
        <Text size="sm" color="dimmed">No broken inheritance risks found.</Text>
      ) : (
        <Accordion>
          {Object.entries(groupedFindings).map(([topLevelFolder, findings]: [string, any[]]) => (
            <Accordion.Item key={topLevelFolder} value={topLevelFolder}>
              <Accordion.Control>{topLevelFolder} ({findings.length} issues)</Accordion.Control>
              <Accordion.Panel>
                <Table fontSize="sm" striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Parent Folder</th>
                      <th>Extra User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((item, i) => (
                      <tr key={i}>
                        <td><Anchor href={item.link} target="_blank" size="sm">{item.name}</Anchor></td>
                        <td>{item.parentName}</td>
                        <td>{maskEmails ? maskEmail(item.extraUser) : item.extraUser}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();

  const [files, setFiles] = useState<PublicFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [maskEmails, setMaskEmails] = useState(false);

  const fetchRiskData = () => {
    setIsLoading(true);
    fetch('/api/risks/public')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
      })
      .then((data: PublicFile[]) => {
        setFiles(data);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanResult('Scan in progress...');
    setError(null);
    try {
      const response = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: folderName || null }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Scan failed.');
      }
      setScanResult(`Scan complete! Found ${result.count || ''} items. Refreshing results...`);
      fetchRiskData();
    } catch (err: any) {
      setScanResult(`Error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <Group position="apart" mb="xl">
        <Title>Dashboard</Title>
        <Group>
          <Switch
            label="Mask emails"
            checked={maskEmails}
            onChange={(event) => setMaskEmails(event.currentTarget.checked)}
          />
          <Button variant="outline" onClick={() => signOut({ callbackUrl: '/' })}>
            Sign Out
          </Button>
        </Group>
      </Group>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <Title order={3}>Manual Scan</Title>
        <Text c="dimmed" size="sm">
          Enter a folder name or leave blank to scan your entire drive and populate the database.
        </Text>
        
        <TextInput
          placeholder="e.g., Dummy Test Folder - 2025"
          label="Folder Name (Optional)"
          value={folderName}
          onChange={(event) => setFolderName(event.currentTarget.value)}
          mt="md"
        />

        <Button onClick={handleStartScan} loading={isScanning} mt="md">
          Start Scan
        </Button>
        {scanResult && <Text mt="sm" size="sm">{scanResult}</Text>}
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3}>Explore Your Drive</Title>
        <Text c="dimmed" size="sm">
          Navigate through your folders and files to see their permissions.
        </Text>
        <Link href="/browser" passHref>
          <Button mt="md">
            Open File Browser
          </Button>
        </Link>
      </Card>

      <StatisticsCard />
      <BrokenInheritanceCard maskEmails={maskEmails} />
      <AllUsersCard maskEmails={maskEmails} />

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} mb="md">Publicly Shared Files</Title>
        {isLoading ? (
          <Loader />
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : files.length === 0 ? (
          <Text>No publicly shared files found. Run a scan to populate!</Text>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Owner</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{file.name}</td>
                  <td>{maskEmails ? maskEmail(file.owner) : file.owner}</td>
                  <td>
                    <Anchor href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                      Open File
                    </Anchor>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </main>
  );
}