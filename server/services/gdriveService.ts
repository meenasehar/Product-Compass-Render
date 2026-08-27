import { google } from 'googleapis';
import { config } from '../config.js';

function getDriveClient() {
  if (!config.googleServiceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  }
  const credentials = JSON.parse(config.googleServiceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

export async function listFiles(folderId?: string): Promise<Record<string, unknown>[]> {
  const drive = getDriveClient();
  const targetFolder = folderId ?? config.gdriveFolderId;
  const query = targetFolder
    ? `'${targetFolder}' in parents and trashed = false`
    : 'trashed = false';

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, owners)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
  });

  return (res.data.files ?? []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    size: f.size,
    owner: f.owners?.[0]?.displayName,
  }));
}

export async function getFileMetadata(fileId: string): Promise<Record<string, unknown>> {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, webViewLink, description, owners',
  });
  return res.data as Record<string, unknown>;
}
