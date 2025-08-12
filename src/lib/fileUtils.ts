/**
 * Utility functions for file operations and path handling
 */

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

/**
 * Extract all file paths from project structure tree
 */
export function extractFilePaths(files: FileNode[], currentPath = ''): string[] {
  const filePaths: string[] = [];
  
  for (const file of files) {
    const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
    
    if (file.type === 'file') {
      filePaths.push(fullPath);
    } else if (file.type === 'directory' && file.children) {
      filePaths.push(...extractFilePaths(file.children, fullPath));
    }
  }
  
  return filePaths;
}

/**
 * Parse message to extract file references (@filename)
 */
export function parseFileReferences(message: string): string[] {
  const fileRefRegex = /@([^\s@]+)/g;
  const matches = [];
  let match;
  
  while ((match = fileRefRegex.exec(message)) !== null) {
    matches.push(match[1]);
  }
  
  console.log("parseFileReferences: Input message:", message);
  console.log("parseFileReferences: Extracted references:", matches);
  return matches;
}

/**
 * Filter file paths based on search query
 */
export function filterFiles(files: string[], query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const filtered = files
    .filter(file => file.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      // Prioritize exact matches and files over directories
      const aScore = a.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      const bScore = b.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      return aScore - bScore || a.localeCompare(b);
    })
    .slice(0, 10); // Limit to 10 suggestions
  
  console.log("filterFiles: Query:", query, "Total files:", files.length, "Filtered:", filtered);
  return filtered;
}