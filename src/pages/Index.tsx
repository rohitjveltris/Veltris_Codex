
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { ChatPanel } from "@/components/ChatPanel";
import { DocumentationModal } from "@/components/DocumentationModal";
import { MultiCodeGeneratorModal } from "@/components/MultiCodeGeneratorModal";
import { DiffApprovalModal } from "@/components/DiffApprovalModal";
import { useAppContext } from "@/hooks/useAppContext";

const Index = () => {
  const { showDocumentationModal, showMultiCodeModal, diffApproval, dispatch } = useAppContext();

  const handleDiffApprove = (filePath: string) => {
    dispatch({ type: 'SET_DIFF_APPROVAL', payload: { isOpen: false, modificationResult: null } });
    // Update the chat message to show approval
    dispatch({ 
      type: 'UPDATE_LAST_CHAT_MESSAGE', 
      payload: `✅ Changes approved and applied to ${filePath}! The file has been successfully optimized with your requested improvements.`
    });
  };

  const handleDiffReject = (filePath: string) => {
    dispatch({ type: 'SET_DIFF_APPROVAL', payload: { isOpen: false, modificationResult: null } });
    // Update the chat message to show rejection
    dispatch({ 
      type: 'UPDATE_LAST_CHAT_MESSAGE', 
      payload: `❌ Changes to ${filePath} were rejected. The original file remains unchanged.`
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 noise-texture">
      <div className="flex flex-col h-screen">
        <TopBar />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Editor />
          <ChatPanel />
        </div>
      </div>

      <DocumentationModal 
        open={showDocumentationModal} 
        onOpenChange={(checked) => dispatch({ type: 'SET_DOCUMENTATION_MODAL_VISIBILITY', payload: checked })}
      />
      <MultiCodeGeneratorModal
        open={showMultiCodeModal}
        onOpenChange={(checked) => dispatch({ type: 'SET_MULTI_CODE_MODAL_VISIBILITY', payload: checked })}
      />

      <DiffApprovalModal
        open={diffApproval.isOpen}
        onOpenChange={(open) => dispatch({ 
          type: 'SET_DIFF_APPROVAL', 
          payload: { isOpen: open, modificationResult: open ? diffApproval.modificationResult : null } 
        })}
        modificationResult={diffApproval.modificationResult}
        onApprove={handleDiffApprove}
        onReject={handleDiffReject}
      />
    </div>
  );
};

export default Index;
