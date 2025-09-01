
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Settings, User, Wifi, WifiOff, AlertTriangle, RefreshCw, FolderOpen, FlaskConical } from "lucide-react";


import { useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getModels } from '@/lib/api';

export function TopBar() {
  const { availableModels, selectedModel, modelsLoaded, showTestGenerationPanel, dispatch, workingDirectory } = useAppContext();
  const [localWorkingDirectory, setLocalWorkingDirectory] = useState(workingDirectory || '');
  
  // Re-enable connection status with models loaded info
  const { connectionState, isConnected, isDisconnected, isChecking, manualRefresh } = useConnectionStatus(selectedModel, modelsLoaded);

  useEffect(() => {
    console.log('TopBar: Loading models...');
    getModels().then(models => {
      console.log('TopBar: Received models:', models);
      dispatch({ type: 'SET_MODELS', payload: models });
      if (models.length > 0) {
        console.log('TopBar: Selecting first model:', models[0]);
        dispatch({ type: 'SELECT_MODEL', payload: models[0] });
      }
      dispatch({ type: 'SET_MODELS_LOADED', payload: true });
    }).catch(error => {
      console.error('TopBar: Error loading models:', error);
      dispatch({ type: 'SET_MODELS_LOADED', payload: true });
    });
  }, [dispatch]);

  useEffect(() => {
    dispatch({ type: 'SET_CONNECTION_STATE', payload: connectionState });
  }, [connectionState, dispatch]);

  const handleSetDirectory = () => {
    dispatch({ type: 'SET_WORKING_DIRECTORY', payload: localWorkingDirectory });
  };

  const getStatusConfig = () => {
    if (isChecking) {
      return {
        text: 'Checking...',
        variant: 'secondary' as const,
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: RefreshCw,
        iconClassName: 'animate-spin',
        tooltip: 'Checking connection status'
      };
    } else if (isConnected) {
      return {
        text: 'Connected',
        variant: 'secondary' as const,
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: Wifi,
        iconClassName: 'animate-pulse-glow',
        tooltip: `${selectedModel?.name || 'Selected model'} is online`
      };
    } else {
      return {
        text: 'Disconnected',
        variant: 'destructive' as const,
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: WifiOff,
        iconClassName: 'animate-pulse',
        tooltip: `${selectedModel?.name || 'Selected model'} is offline`
      };
    }
  };

  const statusConfig = getStatusConfig();

  // ... rest of the component

  

  return (
    <div className="h-14 glass-effect border-b border-white/10 flex items-center justify-between px-6 relative z-50">
      {/* Logo and Brand */}
      <div className="flex items-center space-x-3">
        <img 
          src="/veltris-small-icon.png" 
          alt="Logo" 
          className="w-8 h-8 object-contain"
        />
        <div>
          <h1 className="text-lg font-bold gradient-text">SDLC AI</h1>
          <div className="text-xs text-muted-foreground -mt-1">Professional Edition</div>
        </div>
      </div>

      {/* Center Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Set working directory..." 
            value={localWorkingDirectory} 
            onChange={(e) => setLocalWorkingDirectory(e.target.value)} 
            className="bg-transparent text-sm w-64 focus:outline-none" 
          />
          <Button size="sm" onClick={handleSetDirectory} className="h-6 text-xs">Set</Button>
        </div>
        <Badge 
          variant={statusConfig.variant} 
          className={`cursor-pointer transition-all hover:opacity-80 ${statusConfig.className}`}
          onClick={isDisconnected ? manualRefresh : undefined}
          title={statusConfig.tooltip}
        >
          <statusConfig.icon className={`w-2 h-2 mr-2 ${statusConfig.iconClassName}`} />
          {statusConfig.text}
        </Badge>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center space-x-3">
        <Button 
          variant={showTestGenerationPanel ? "default" : "ghost"}
          size="sm" 
          className={showTestGenerationPanel ? "bg-blue-600 hover:bg-blue-700" : "text-muted-foreground hover:text-foreground"}
          onClick={() => dispatch({ type: 'SET_TEST_GENERATION_PANEL_VISIBILITY', payload: !showTestGenerationPanel })}
          title="Toggle Test Generation Panel"
        >
          <FlaskConical className="w-4 h-4" />
        </Button>

        <Select value={selectedModel?.id} onValueChange={(modelId) => dispatch({ type: 'SELECT_MODEL', payload: availableModels?.find(m => m.id === modelId) })}>
          <SelectTrigger className="w-40 bg-muted/50 border-white/10 hover:bg-muted/70 transition-all">
            <Zap className="w-4 h-4 text-emerald-400 mr-2" />
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
            {availableModels && availableModels.length > 0 ? (
              availableModels.map(model => (
                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
              ))
            ) : (
              <SelectItem value="no-models" disabled>No models available</SelectItem>
            )}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
