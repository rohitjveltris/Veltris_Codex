import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiffViewer } from '@/components/DiffViewer';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { writeFile } from '@/lib/api';
import { useAppContext } from '@/hooks/useAppContext';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  line_number: number;
}

interface DiffSummary {
  lines_added: number;
  lines_removed: number;
  lines_changed: number;
}

interface DiffResult {
  diffs: DiffLine[];
  summary: DiffSummary;
}

interface FileModificationResult {
  file_path: string;
  original_content: string;
  modified_content: string;
  diff: DiffResult;
  modification_summary: string;
}

interface DiffApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modificationResult: FileModificationResult | null;
  onApprove?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
}

export function DiffApprovalModal({
  open,
  onOpenChange,
  modificationResult,
  onApprove,
  onReject
}: DiffApprovalModalProps) {
  const { workingDirectory } = useAppContext();
  const [isApplying, setIsApplying] = useState(false);
  const [applicationResult, setApplicationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleApprove = async () => {
    if (!modificationResult) return;

    setIsApplying(true);
    setApplicationResult(null);

    try {
      // Write the modified content to the file
      const writeResult = await writeFile(
        modificationResult.file_path,
        modificationResult.modified_content,
        workingDirectory
      );

      if (writeResult.success) {
        setApplicationResult({
          success: true,
          message: `Changes successfully applied to ${modificationResult.file_path}`
        });
        
        // Call the onApprove callback
        onApprove?.(modificationResult.file_path);
        
        // Close modal after a brief delay
        setTimeout(() => {
          onOpenChange(false);
          setApplicationResult(null);
        }, 2000);
      } else {
        setApplicationResult({
          success: false,
          message: `Failed to apply changes: ${writeResult.message}`
        });
      }
    } catch (error) {
      setApplicationResult({
        success: false,
        message: `Error applying changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    if (!modificationResult) return;
    
    onReject?.(modificationResult.file_path);
    onOpenChange(false);
    setApplicationResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setApplicationResult(null);
  };

  if (!modificationResult) return null;

  const { file_path, original_content, modified_content, diff, modification_summary } = modificationResult;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col glass-effect border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Review File Changes</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Modification Summary */}
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertTriangle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              <strong>Proposed Changes:</strong> {modification_summary}
            </AlertDescription>
          </Alert>

          {/* Application Result */}
          {applicationResult && (
            <Alert className={`${
              applicationResult.success 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              {applicationResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <AlertDescription className={
                applicationResult.success ? 'text-green-300' : 'text-red-300'
              }>
                {applicationResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Diff Viewer */}
          <div className="flex-1 overflow-hidden">
            <DiffViewer
              filePath={file_path}
              originalContent={original_content}
              modifiedContent={modified_content}
              diff={diff}
              className="h-full"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Changes: {diff.summary.lines_added} added, {diff.summary.lines_removed} removed</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isApplying || applicationResult?.success}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Changes
            </Button>
            
            <Button
              onClick={handleApprove}
              disabled={isApplying || applicationResult?.success}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Apply
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}