
import { useEffect, useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { getProjectStructure, getFileContent } from '@/lib/api';
import { File, Folder, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function FileTree({ files, onFileClick, level = 0, currentPath = '' }) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  return (
    <ul className="space-y-1">
      {files.map(file => {
        const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
        const isExpanded = expandedFolders.has(fullPath);

        return (
          <li key={fullPath}>
            {file.type === 'directory' ? (
              <div>
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => toggleFolder(fullPath)}>
                  {file.children && file.children.length > 0 ? (
                    isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  ) : (
                    <ChevronRight size={16} className="opacity-0" /> // Placeholder for alignment
                  )}
                  <Folder size={16} />
                  <span>{file.name}</span>
                </div>
                {isExpanded && file.children && (
                  <div style={{ marginLeft: `${(level + 1) * 20}px` }}>
                    <FileTree files={file.children} onFileClick={onFileClick} level={level + 1} currentPath={fullPath} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onFileClick(fullPath)}>
                <File size={16} />
                <span>{file.name}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  const { projectStructure, dispatch, workingDirectory } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshProjectStructure = async () => {
    setIsRefreshing(true);
    try {
      const data = await getProjectStructure(workingDirectory);
      console.log("Sidebar: Refreshed project structure:", data.result.tree);
      dispatch({ type: 'SET_PROJECT_STRUCTURE', payload: data.result.tree });
    } catch (error) {
      console.error("Sidebar: Error refreshing project structure:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (workingDirectory) {
      refreshProjectStructure();
    }
  }, [dispatch, workingDirectory]);

  const handleFileClick = (path: string) => {
    console.log("Sidebar: File clicked, path:", path);
    getFileContent(path, workingDirectory).then(content => {
      console.log("Sidebar: Received content:", content);
      dispatch({ type: 'SET_ACTIVE_FILE', payload: { path, content: content.result.content } });
    }).catch(error => {
      console.error("Sidebar: Error fetching file content:", error);
    });
  };

  return (
    <div className="w-80 glass-effect border-r border-white/10 flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-foreground">Explorer</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshProjectStructure}
          disabled={isRefreshing}
          className="h-6 w-6 p-0 hover:bg-white/10"
          title="Refresh file explorer"
        >
          <RotateCcw 
            size={14} 
            className={`text-muted-foreground hover:text-foreground transition-colors ${
              isRefreshing ? 'animate-spin' : ''
            }`} 
          />
        </Button>
      </div>
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {projectStructure && projectStructure.length > 0 ? (
          <FileTree files={projectStructure} onFileClick={handleFileClick} />
        ) : (
          <div className="text-muted-foreground text-center py-4">No files found or loading...</div>
        )}
      </div>
    </div>
  );
}
