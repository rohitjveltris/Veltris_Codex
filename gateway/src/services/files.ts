
import { appConfig } from '../config.js';

const AI_SERVICE_URL = appConfig.aiServiceUrl;

export const getProjectStructure = async (workingDirectory?: string) => {
  const response = await fetch(`${AI_SERVICE_URL}/api/files/tree?path=${encodeURIComponent(workingDirectory || '.')}`);
  if (!response.ok) {
    throw new Error("Failed to fetch project structure");
  }
  return response.json();
};

export const getFileContent = async (path: string, workingDirectory?: string) => {
  const response = await fetch(`${AI_SERVICE_URL}/api/files/content?path=${encodeURIComponent(path)}&workingDirectory=${encodeURIComponent(workingDirectory || '')}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch file content for ${path}`);
  }
  return response.json();
};

export const writeFile = async (filePath: string, content: string, workingDirectory?: string) => {
  const response = await fetch(`${AI_SERVICE_URL}/api/files/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath, content: content, workingDirectory }),
  });
  if (!response.ok) {
    throw new Error(`Failed to write file ${filePath}`);
  }
  return response.json();
};
