import * as path from 'path';

const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.ico',
  '.tiff',
  '.tif',
  // Documents
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  // Text
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.rb',
  '.go',
  '.rs',
  '.sh',
  '.bat',
  '.yml',
  '.yaml',
  '.log',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.sql',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.tar.gz',
  '.tgz',
  '.rar',
  '.7z',
  '.bz2',
  // Other
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.mkv',
]);

const MIME_TYPE_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt', '.md', '.csv', '.log', '.ini', '.cfg', '.conf'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'application/zip': ['.zip'],
  'application/gzip': ['.gz', '.tgz'],
  'application/x-tar': ['.tar'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
};

export function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export function getFileCategory(
  mimeType: string,
): 'image' | 'pdf' | 'text' | 'binary' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  )
    return 'text';
  return 'binary';
}

export function validateMimeAndExtension(
  mimeType: string,
  filename: string,
): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  // For known MIME types, validate extension matches
  const allowedExts = MIME_TYPE_MAP[mimeType];
  if (allowedExts && !allowedExts.includes(ext)) return false;
  return true;
}
