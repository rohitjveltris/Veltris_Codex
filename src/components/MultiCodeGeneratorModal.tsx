import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Plus, Trash, Code, Sparkles } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import { useAppContext } from "@/hooks/useAppContext";

interface CodeRequestItem {
  id: number;
  prompt: string;
  filePath: string;
  language: string;
}

interface MultiCodeGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MultiCodeGeneratorModal({ open, onOpenChange }: MultiCodeGeneratorModalProps) {
  const { sendMessage } = useAIChat();
  const { dispatch } = useAppContext();
  const [codeRequests, setCodeRequests] = useState<CodeRequestItem[]>([
    { id: 1, prompt: '', filePath: '', language: '' }
  ]);

  const addCodeRequest = () => {
    setCodeRequests(prev => [...prev, { id: Date.now(), prompt: '', filePath: '', language: '' }]);
  };

  const removeCodeRequest = (id: number) => {
    setCodeRequests(prev => prev.filter(req => req.id !== id));
  };

  const updateCodeRequest = (id: number, field: keyof CodeRequestItem, value: string) => {
    setCodeRequests(prev => 
      prev.map(req => (req.id === id ? { ...req, [field]: value } : req))
    );
  };

  const handleGenerateAll = () => {
    if (codeRequests.some(req => !req.prompt || !req.filePath)) {
      alert("Please fill in all prompt and file path fields.");
      return;
    }

    const items = codeRequests.map(req => ({
      prompt: req.prompt,
      file_path: req.filePath,
      language: req.language || undefined,
    }));

    const promptMessage = `Generate the following code files:\n${items.map(item => `- ${item.file_path} (${item.language || 'auto'}): ${item.prompt}`).join('\n')}`;

    sendMessage(promptMessage, { tool_name: 'generate_code', parameters: { items: items } });
    onOpenChange(false); // Close modal
    dispatch({ type: 'SET_MULTI_CODE_MODAL_VISIBILITY', payload: false }); // Ensure context is updated
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col glass-effect border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-blue-400" />
            <span>Multi-File Code Generator</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-6 pb-4">
            {codeRequests.map((req, index) => (
              <Card key={req.id} className="p-4 bg-muted/20 border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-sm">Code Request #{index + 1}</h4>
                  <Button variant="ghost" size="sm" onClick={() => removeCodeRequest(req.id)}>
                    <Trash className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Prompt:</label>
                    <Textarea
                      placeholder="e.g., Python function to calculate Fibonacci numbers"
                      value={req.prompt}
                      onChange={(e) => updateCodeRequest(req.id, 'prompt', e.target.value)}
                      rows={3}
                      className="bg-muted/50 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">File Path:</label>
                    <Input
                      placeholder="e.g., src/utils/fibonacci.py"
                      value={req.filePath}
                      onChange={(e) => updateCodeRequest(req.id, 'filePath', e.target.value)}
                      className="bg-muted/50 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Language (optional):</label>
                    <Input
                      placeholder="e.g., python, javascript"
                      value={req.language}
                      onChange={(e) => updateCodeRequest(req.id, 'language', e.target.value)}
                      className="bg-muted/50 border-white/10"
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={addCodeRequest} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Code Request
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t border-white/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-primary hover:bg-primary/90 glow-emerald" onClick={handleGenerateAll}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate All Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}