# Frontend Integration Guide

This guide explains how to integrate your frontend application with the Veltris Codex Backend API.

## API Overview

The backend provides a streaming chat API that supports multiple AI models (GPT-4o and Claude 3.5 Sonnet) with intelligent tool calling capabilities.

**Base URL**: `http://localhost:3001`

## Authentication (Optional)

If the backend is configured with a bearer token, include it in your requests:

```javascript
headers: {
  'Authorization': 'Bearer your-api-key-here'
}
```

## Available Endpoints

### 1. Get Available Models

```javascript
GET /api/models
```

Returns a list of available AI models and their status.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "provider": "openai",
        "description": "Latest GPT-4 Optimized model",
        "capabilities": ["text_generation", "tool_calling", "streaming"],
        "available": true
      },
      {
        "id": "claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet", 
        "provider": "anthropic",
        "description": "Anthropic's most capable model",
        "capabilities": ["text_generation", "tool_calling", "streaming"],
        "available": true
      }
    ],
    "total": 2,
    "available": 2
  }
}
```

### 2. Health Check

```javascript
GET /api/health
```

Returns system health status and service availability.

### 3. Chat with Streaming

```javascript
POST /api/chat
```

Streams AI responses with real-time tool execution.

## Frontend Integration Examples

### React Hook for Chat Streaming

```typescript
import { useState, useEffect } from 'react';

interface StreamChunk {
  type: 'ai_chunk' | 'tool_status' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool?: string;
  status?: 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolResults?: any[];
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  const sendMessage = async (
    message: string, 
    model: string = 'gpt-4o',
    context?: {
      filePath?: string;
      codeContent?: string;
      projectStructure?: string;
    }
  ) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentResponse('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if needed:
          // 'Authorization': 'Bearer your-token'
        },
        body: JSON.stringify({ message, model, context })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantMessage = '';
      const toolResults: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'ai_chunk':
                  assistantMessage += data.content || '';
                  setCurrentResponse(assistantMessage);
                  break;
                  
                case 'tool_status':
                  console.log(`Tool ${data.tool} status: ${data.status}`);
                  break;
                  
                case 'tool_result':
                  toolResults.push({
                    tool: data.tool,
                    result: data.result
                  });
                  break;
                  
                case 'done':
                  // Stream completed
                  const finalMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: assistantMessage,
                    timestamp: new Date(),
                    toolResults: toolResults.length > 0 ? toolResults : undefined
                  };
                  
                  setMessages(prev => [...prev, finalMessage]);
                  setCurrentResponse('');
                  setIsLoading(false);
                  return;
                  
                case 'error':
                  throw new Error(data.error || 'Unknown error');
              }
            } catch (e) {
              console.warn('Failed to parse stream chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setCurrentResponse('');
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return {
    messages,
    isLoading,
    currentResponse,
    sendMessage
  };
};
```

### Alternative: EventSource (SSE) Implementation

```typescript
export const useAIChatEventSource = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, model: string = 'gpt-4o') => {
    setIsLoading(true);
    
    // Note: EventSource doesn't support POST directly
    // You'll need to send the message via POST first, then connect to SSE
    
    const eventSource = new EventSource(
      `/api/chat?message=${encodeURIComponent(message)}&model=${model}`
    );

    let assistantContent = '';
    const toolResults: any[] = [];

    eventSource.onmessage = (event) => {
      try {
        const data: StreamChunk = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ai_chunk':
            assistantContent += data.content || '';
            break;
            
          case 'tool_result':
            toolResults.push({ tool: data.tool, result: data.result });
            break;
            
          case 'done':
            const finalMessage: ChatMessage = {
              id: Date.now().toString(),
              type: 'assistant',
              content: assistantContent,
              timestamp: new Date(),
              toolResults: toolResults.length > 0 ? toolResults : undefined
            };
            
            setMessages(prev => [...prev, finalMessage]);
            setIsLoading(false);
            eventSource.close();
            break;
            
          case 'error':
            console.error('Stream error:', data.error);
            setIsLoading(false);
            eventSource.close();
            break;
        }
      } catch (e) {
        console.warn('Failed to parse SSE data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsLoading(false);
      eventSource.close();
    };
  };

  return { messages, isLoading, sendMessage };
};
```

### React Component Example

```tsx
import React, { useState } from 'react';
import { useAIChat } from './hooks/useAIChat';

export const ChatInterface: React.FC = () => {
  const { messages, isLoading, currentResponse, sendMessage } = useAIChat();
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    sendMessage(inputValue, selectedModel, {
      filePath: 'current-file.tsx',
      codeContent: 'const example = "code";'
    });
    
    setInputValue('');
  };

  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="content">{message.content}</div>
            
            {message.toolResults && (
              <div className="tool-results">
                {message.toolResults.map((tool, idx) => (
                  <div key={idx} className="tool-result">
                    <strong>{tool.tool}:</strong>
                    <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && currentResponse && (
          <div className="message assistant streaming">
            {currentResponse}
            <span className="cursor">|</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <select 
          value={selectedModel} 
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
        </select>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about your code..."
          disabled={isLoading}
        />
        
        <button type="submit" disabled={isLoading || !inputValue.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};
```

## TypeScript Types

Include these types in your frontend project:

```typescript
// API Types
export interface StreamChunk {
  type: 'ai_chunk' | 'tool_status' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool?: string;
  status?: 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp?: number;
}

export interface ChatRequest {
  message: string;
  model: 'gpt-4o' | 'claude-3.5-sonnet';
  context?: {
    filePath?: string;
    codeContent?: string;
    projectStructure?: string;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  description: string;
  capabilities: string[];
  available: boolean;
}

// Tool Result Types
export interface CodeDiffResult {
  diffs: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
  }>;
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesChanged: number;
  };
}

export interface DocumentationResult {
  content: string;
  docType: string;
  sections: string[];
  wordCount: number;
}
```

## Error Handling

Always implement proper error handling for network requests and stream parsing:

```typescript
const handleStreamError = (error: Error) => {
  console.error('Stream error:', error);
  
  // Show user-friendly error message
  setMessages(prev => [...prev, {
    id: Date.now().toString(),
    type: 'assistant',
    content: 'Sorry, I encountered an error. Please try again.',
    timestamp: new Date()
  }]);
};
```

## Rate Limiting

The API implements rate limiting (100 requests per 15 minutes by default). Handle rate limit responses:

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
  // Show rate limit message to user
}
```

## Best Practices

1. **Always validate responses** before parsing JSON
2. **Implement reconnection logic** for failed streams  
3. **Show loading states** during tool execution
4. **Cache model availability** to avoid repeated checks
5. **Provide fallback UI** when streaming fails
6. **Handle partial responses** gracefully
7. **Implement proper cleanup** for EventSource/fetch streams

## Development vs Production

### Development
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

### Production
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-backend-domain.com';
```

Make sure to configure CORS properly for your production domain in the backend configuration.