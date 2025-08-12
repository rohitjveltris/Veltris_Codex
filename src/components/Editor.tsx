
import { useAppContext } from '@/hooks/useAppContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Editor() {
  const { activeFile, activeFileContent } = useAppContext();
  console.log("Editor: activeFile", activeFile);
  console.log("Editor: activeFileContent", activeFileContent);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden"> {/* Added overflow-hidden */}
        {activeFile ? (
          <ScrollArea className="h-full w-full"> {/* Added w-full */}
            <div className="p-4 font-mono text-sm leading-relaxed h-full"> {/* Added h-full */}
              <pre className="text-foreground whitespace-pre-wrap h-full overflow-auto"> {/* Added h-full overflow-auto */}
                {activeFileContent}
              </pre>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  );
}
