export interface StreamChunk {
  type: 'ai_chunk' | 'tool_status' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool?: string;
  status?: 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp?: number;
}

export interface AIChunk extends StreamChunk {
  type: 'ai_chunk';
  content: string;
}

export interface ToolStatusChunk extends StreamChunk {
  type: 'tool_status';
  tool: string;
  status: 'executing' | 'completed' | 'failed';
}

export interface ToolResultChunk extends StreamChunk {
  type: 'tool_result';
  tool: string;
  result: any;
}

export interface DoneChunk extends StreamChunk {
  type: 'done';
}

export interface ErrorChunk extends StreamChunk {
  type: 'error';
  error: string;
}

export type StreamMessage = AIChunk | ToolStatusChunk | ToolResultChunk | DoneChunk | ErrorChunk;