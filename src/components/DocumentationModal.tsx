
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/hooks/useAppContext";
import { useAIChat } from "@/hooks/useAIChat";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  Sparkles,
  Eye
} from "lucide-react";

interface DocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentationModal({ open, onOpenChange }: DocumentationModalProps) {
  const { documentationSettings, dispatch } = useAppContext();
  const { sendMessage } = useAIChat();
  const [projectContext, setProjectContext] = useState('');

  const documents = [
    { id: 'brd', name: 'Business Requirements Document', description: 'High-level business objectives and requirements', size: '~2-3 pages' },
    { id: 'srd', name: 'Software Requirements Document', description: 'Technical specifications and system requirements', size: '~5-7 pages' },
    { id: 'readme', name: 'README.md', description: 'Project overview, setup, and usage instructions', size: '~1-2 pages' },
    { id: 'api_docs', name: 'API Documentation', description: 'Endpoint specifications and examples', size: '~2-3 pages' }
  ];

  const toggleDocument = (id: string) => {
    dispatch({
      type: 'SET_DOCUMENTATION_SETTINGS',
      payload: {
        ...documentationSettings,
        [id]: !documentationSettings[id as keyof typeof documentationSettings],
      },
    });
  };

  // Placeholder for progress and status, will be dynamic later
  const [progress, setProgress] = useState(0);
  const getStatusIcon = (status: 'pending' | 'generating' | 'completed') => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'generating': return <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };
  const getStatusBadge = (status: 'pending' | 'generating' | 'completed') => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ready</Badge>;
      case 'generating': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Generating...</Badge>;
      case 'pending': return <Badge variant="secondary">Queued</Badge>;
    }
  };

  const handleGenerateDocumentation = () => {
    const selectedDocTypes = Object.keys(documentationSettings).filter(key => documentationSettings[key as keyof typeof documentationSettings]);
    if (selectedDocTypes.length === 0) {
      alert("Please select at least one document type to generate.");
      return;
    }

    let prompt = `Generate documentation for the project.`;
    if (selectedDocTypes.length > 0) {
      prompt += ` I need the following types: ${selectedDocTypes.join(", ")}.`;
    }
    if (projectContext.trim()) {
      prompt += `\n\nProject Context: ${projectContext.trim()}`; 
    }

    sendMessage(prompt);
    onOpenChange(false); // Close the modal after sending the message
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col glass-effect border-white/10"> {/* Added h-[90vh] and flex flex-col */}
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Documentation Generator</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6"> {/* Added ScrollArea and flex-1 pr-6 */}
          <div className="space-y-6 pb-4"> {/* Added pb-4 */}
            {/* Project Context Input */}
            <Card className="p-4 bg-muted/30 border-white/10">
              <h3 className="text-sm font-medium mb-2">Project Context / Goal</h3>
              <Textarea
                placeholder="Describe the project, its purpose, or specific goals for the documentation..."
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                rows={4}
                className="bg-muted/50 border-white/10"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Provide a brief overview to help the AI generate accurate documentation.
              </p>
            </Card>

            {/* Documents List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Select Documents to Generate</h3>
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 bg-muted/20 border-white/10 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={documentationSettings[doc.id as keyof typeof documentationSettings]}
                      onCheckedChange={() => toggleDocument(doc.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{doc.name}</h4>
                        <div className="flex items-center space-x-2">
                          {/* Status will be dynamic later */}
                          {getStatusIcon('pending')}
                          {getStatusBadge('pending')}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">{doc.description}</p>
                      
                      <span className="text-xs text-muted-foreground">{doc.size}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <DialogFooter className="pt-4 border-t border-white/10">
          <div className="text-sm text-muted-foreground mr-auto">
            {Object.values(documentationSettings).filter(Boolean).length} documents selected
          </div>
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-primary hover:bg-primary/90 glow-emerald" onClick={handleGenerateDocumentation}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
