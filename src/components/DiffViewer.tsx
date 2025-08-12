import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface DiffViewerProps {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  diff: DiffResult;
  className?: string;
}

export function DiffViewer({ 
  filePath, 
  originalContent, 
  modifiedContent, 
  diff, 
  className = '' 
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [copiedContent, setCopiedContent] = useState<'original' | 'modified' | null>(null);

  const handleCopy = async (content: string, type: 'original' | 'modified') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(type);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const renderLineNumber = (lineNumber: number, type: 'added' | 'removed' | 'unchanged') => {
    if (!showLineNumbers) return null;
    
    return (
      <span 
        className={`inline-block w-12 text-xs text-right pr-2 select-none border-r border-white/10 ${
          type === 'added' ? 'text-green-400/70' :
          type === 'removed' ? 'text-red-400/70' :
          'text-muted-foreground/70'
        }`}
      >
        {lineNumber}
      </span>
    );
  };

  const renderDiffLine = (line: DiffLine, index: number) => {
    const baseClasses = 'block w-full px-3 py-1 font-mono text-sm leading-relaxed';
    
    let lineClasses = baseClasses;
    let prefix = '';
    let bgColor = '';
    
    switch (line.type) {
      case 'added':
        lineClasses += ' text-green-300';
        bgColor = 'bg-green-500/20 border-l-4 border-green-500';
        prefix = '+';
        break;
      case 'removed':
        lineClasses += ' text-red-300';
        bgColor = 'bg-red-500/20 border-l-4 border-red-500';
        prefix = '-';
        break;
      case 'unchanged':
        lineClasses += ' text-foreground/80';
        bgColor = 'bg-transparent';
        prefix = ' ';
        break;
    }

    return (
      <div
        key={index}
        className={`${bgColor} ${lineClasses} flex items-center hover:bg-white/5 transition-colors`}
      >
        {showLineNumbers && renderLineNumber(line.line_number, line.type)}
        <span className="text-muted-foreground/50 mr-2 select-none w-4">{prefix}</span>
        <span className="flex-1 whitespace-pre-wrap break-all">{line.content || ' '}</span>
      </div>
    );
  };

  const renderSplitView = () => {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="grid grid-cols-2 gap-1">
        {/* Original Content */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-red-500/10 px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-red-300">Original</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(originalContent, 'original')}
              className="h-6 w-6 p-0"
            >
              {copiedContent === 'original' ? 
                <Check size={12} className="text-green-400" /> : 
                <Copy size={12} />
              }
            </Button>
          </div>
          <div className="max-h-96 overflow-auto">
            {originalLines.map((line, index) => (
              <div key={index} className="flex items-center px-3 py-1 font-mono text-sm hover:bg-white/5">
                {showLineNumbers && (
                  <span className="w-10 text-xs text-muted-foreground/70 text-right pr-2 border-r border-white/10">
                    {index + 1}
                  </span>
                )}
                <span className="flex-1 ml-2 whitespace-pre-wrap">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modified Content */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-green-500/10 px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-green-300">Modified</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(modifiedContent, 'modified')}
              className="h-6 w-6 p-0"
            >
              {copiedContent === 'modified' ? 
                <Check size={12} className="text-green-400" /> : 
                <Copy size={12} />
              }
            </Button>
          </div>
          <div className="max-h-96 overflow-auto">
            {modifiedLines.map((line, index) => (
              <div key={index} className="flex items-center px-3 py-1 font-mono text-sm hover:bg-white/5">
                {showLineNumbers && (
                  <span className="w-10 text-xs text-muted-foreground/70 text-right pr-2 border-r border-white/10">
                    {index + 1}
                  </span>
                )}
                <span className="flex-1 ml-2 whitespace-pre-wrap">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`border border-white/10 rounded-lg bg-background/50 backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 w-6 p-0"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </Button>
            <span className="font-medium text-sm">{filePath}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Summary */}
            <div className="flex items-center gap-3 text-xs">
              {diff.summary.lines_added > 0 && (
                <span className="text-green-400">+{diff.summary.lines_added}</span>
              )}
              {diff.summary.lines_removed > 0 && (
                <span className="text-red-400">-{diff.summary.lines_removed}</span>
              )}
              {diff.summary.lines_changed > 0 && (
                <span className="text-blue-400">~{diff.summary.lines_changed}</span>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-background rounded-md p-1">
              <Button
                variant={viewMode === 'unified' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('unified')}
                className="h-6 text-xs"
              >
                Unified
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('split')}
                className="h-6 text-xs"
              >
                Split
              </Button>
            </div>

            {/* Line Numbers Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className="h-6 text-xs"
            >
              {showLineNumbers ? 'Hide' : 'Show'} Lines
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="overflow-hidden">
          {viewMode === 'split' ? (
            renderSplitView()
          ) : (
            <div className="max-h-96 overflow-auto">
              {diff.diffs.map((line, index) => renderDiffLine(line, index))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}