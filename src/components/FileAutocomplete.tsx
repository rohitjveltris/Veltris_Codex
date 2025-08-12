import { useState, useEffect, useRef } from 'react';
import { File, Folder } from 'lucide-react';
import { extractFilePaths, filterFiles } from '@/lib/fileUtils';
import { useAppContext } from '@/hooks/useAppContext';

interface FileAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FileAutocomplete({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder, 
  disabled 
}: FileAutocompleteProps) {
  const { projectStructure } = useAppContext();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract file paths when project structure changes
  useEffect(() => {
    if (projectStructure) {
      const paths = extractFilePaths(projectStructure);
      console.log("FileAutocomplete: Project structure:", projectStructure);
      console.log("FileAutocomplete: Extracted file paths:", paths);
      setFilePaths(paths);
    }
  }, [projectStructure]);

  // Handle input changes and detect @ triggers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Check if we're typing after an @
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    
    if (atMatch) {
      const query = atMatch[1];
      setCurrentQuery(query);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  // Get filtered suggestions
  const suggestions = showSuggestions && currentQuery !== undefined 
    ? filterFiles(filePaths, currentQuery)
    : [];
  
  // Debug suggestions
  useEffect(() => {
    if (showSuggestions) {
      console.log("FileAutocomplete: Current query:", currentQuery);
      console.log("FileAutocomplete: Available file paths:", filePaths);
      console.log("FileAutocomplete: Filtered suggestions:", suggestions);
    }
  }, [showSuggestions, currentQuery, filePaths, suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (!e.shiftKey) {
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            insertFileReference(suggestions[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          insertFileReference(suggestions[selectedIndex]);
        }
        break;
    }
  };

  // Insert selected file reference
  const insertFileReference = (filePath: string) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    
    if (atMatch && inputRef.current) {
      const startPos = cursorPosition - atMatch[1].length;
      const newValue = textBeforeCursor.slice(0, startPos) + filePath + ' ' + textAfterCursor;
      onChange(newValue);
      
      // Set cursor position after the inserted text
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = startPos + filePath.length + 1;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          inputRef.current.focus();
        }
      }, 0);
    }
    
    setShowSuggestions(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (filePath: string) => {
    insertFileReference(filePath);
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full min-h-[100px] max-h-[200px] p-3 rounded-lg border border-white/10 bg-background/50 backdrop-blur-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
        style={{ paddingBottom: '2.5rem' }}
      />

      {/* File reference suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full bottom-full mb-1 bg-background/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          <div className="p-2 text-xs text-muted-foreground border-b border-white/10">
            File suggestions for "@{currentQuery}"
          </div>
          {suggestions.map((filePath, index) => (
            <div
              key={filePath}
              onClick={() => handleSuggestionClick(filePath)}
              className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${
                index === selectedIndex 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'hover:bg-white/5'
              }`}
            >
              <File size={14} className="text-muted-foreground" />
              <span className="text-sm">{filePath}</span>
            </div>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="absolute bottom-2 left-3 text-xs text-muted-foreground">
        Type @ to reference files • Enter to send • Shift+Enter for new line
      </div>
    </div>
  );
}