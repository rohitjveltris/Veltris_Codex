
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Send, 
  Paperclip, 
  Sparkles, 
  FileText, 
  Wand2, 
  RefreshCw,
  MessageSquare,
  Bot,
  User,
  Wifi,
  WifiOff,
  AlertTriangle
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { useAIChat } from "@/hooks/useAIChat";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { FileAutocomplete } from "@/components/FileAutocomplete";
import { parseFileReferences } from "@/lib/fileUtils";
import { isModelAvailable } from "@/utils/modelMapping";

export function ChatPanel() {
  const { chatMessages, showDocumentationModal, dispatch, selectedModel, modelsLoaded } = useAppContext();
  const { connectionState, isConnected, isDisconnected, isChecking } = useConnectionStatus(selectedModel, modelsLoaded);
  const { sendMessage, isLoading } = useAIChat();
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    // Only prevent sending if models are loaded AND we're disconnected
    // During initial loading (isChecking), allow sending
    if (!inputValue.trim() || (modelsLoaded && isDisconnected)) return;
    
    // Parse file references from the message
    const referencedFiles = parseFileReferences(inputValue);
    
    // Send message with file references for context
    sendMessage(inputValue, undefined, referencedFiles);
    setInputValue('');
  };

  const getStatusConfig = () => {
    if (isChecking) {
      return {
        text: 'Connecting...',
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: RefreshCw,
        tooltip: 'Checking connection status'
      };
    } else if (isConnected) {
      return {
        text: 'Online',
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: Wifi,
        tooltip: `${selectedModel?.name || 'Model'} is online`
      };
    } else {
      return {
        text: 'Offline',
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: WifiOff,
        tooltip: `${selectedModel?.name || 'Model'} is offline`
      };
    }
  };

  const statusConfig = getStatusConfig();
  const currentModelAvailable = selectedModel ? isModelAvailable(selectedModel.id, connectionState.services) : false;

  return (
    <div className="w-96 glass-effect border-l border-white/10 flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Assistant</h2>
              <div className="text-xs text-muted-foreground">
                {selectedModel?.name || 'Select a model'}
                {modelsLoaded && !currentModelAvailable && !isChecking && (
                  <span className="text-red-400 ml-1">• Unavailable</span>
                )}
              </div>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={statusConfig.className}
            title={statusConfig.tooltip}
          >
            <statusConfig.icon className={`w-3 h-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            {statusConfig.text}
          </Badge>
        </div>

        {/* Documentation Toggle */}
        <Card className="p-3 bg-muted/30 border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Generate Documentation</span>
            </div>
            <Switch
              checked={showDocumentationModal}
              onCheckedChange={(checked) => dispatch({ type: 'SET_DOCUMENTATION_MODAL_VISIBILITY', payload: checked })}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
          {showDocumentationModal && (
            <div className="mt-2 text-xs text-muted-foreground">
              Will generate: BRD, SRD, README, Architecture docs
            </div>
          )}
        </Card>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {modelsLoaded && isDisconnected && chatMessages.length === 0 && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <WifiOff className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-medium text-red-400">
                    {selectedModel?.name || 'Model'} Offline
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedModel?.name || 'Selected model'} is currently unavailable.
                </div>
              </div>
            </div>
          )}

          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground ml-4'
                    : 'bg-muted/50 mr-4 border border-white/10'
                }`}
              >
                <div className="text-sm leading-relaxed">{message.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-2xl px-4 py-3 mr-4 border border-white/10">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <FileAutocomplete
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSendMessage}
              placeholder="Ask me anything about your code... (Type @ to reference files)"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || (modelsLoaded && isDisconnected)}
            className="bg-primary hover:bg-primary/90 glow-emerald self-end mb-2"
            size="sm"
            title={(modelsLoaded && isDisconnected) ? `Cannot send messages while ${selectedModel?.name || 'model'} is offline` : 'Send message'}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex space-x-3">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => dispatch({ type: 'SET_MULTI_CODE_MODAL_VISIBILITY', payload: true })}>
              <Wand2 className="w-3 h-3 mr-1" />
              Generate Code
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              Explain
            </Button>
          </div>
          <span>⌘ + Enter to send</span>
        </div>
      </div>
    </div>
  );
}
