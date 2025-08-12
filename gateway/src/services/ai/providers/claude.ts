import Anthropic from '@anthropic-ai/sdk';
import { appConfig } from '@/config.js';
import { AI_TOOLS } from '@/types/tools.js';
import { StreamMessage } from '@/types/streaming.js';
import { toolExecutor, ToolFunction } from '@/services/toolExecutor.js';
import { ChatContext } from './openai.js';

export class ClaudeProvider {
  private client: Anthropic;

  constructor() {
    if (!appConfig.anthropicApiKey) {
      throw new Error('Anthropic API key not provided');
    }
    
    this.client = new Anthropic({
      apiKey: appConfig.anthropicApiKey
    });
  }

  async *streamChat(message: string, context?: ChatContext): AsyncGenerator<StreamMessage> {
    try {
      // Prepare messages with context
      const { messages, systemPrompt } = this.prepareMessages(message, context);

      // Create completion with tool calling
      const completion = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages,
        system: systemPrompt,
        tools: AI_TOOLS,
        tool_choice: { type: 'auto' },
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      });

      for await (const chunk of completion) {
        if (chunk.type === 'content_block_start') {
          // Handle tool use start
          if (chunk.content_block.type === 'tool_use') {
            yield {
              type: 'tool_status',
              tool: chunk.content_block.name,
              status: 'executing',
              timestamp: Date.now()
            };
          }
        }

        if (chunk.type === 'content_block_delta') {
          // Handle text content
          if (chunk.delta.type === 'text_delta') {
            yield {
              type: 'ai_chunk',
              content: chunk.delta.text,
              timestamp: Date.now()
            };
          }
        }

        if (chunk.type === 'content_block_stop') {
          // Handle completed tool use
          if (chunk.content_block?.type === 'tool_use') {
            try {
              const toolName = chunk.content_block.name as ToolFunction;
              const toolInput = chunk.content_block.input;

              const toolResult = await toolExecutor.executeTool(toolName, toolInput);

              if (toolResult.success) {
                yield {
                  type: 'tool_result',
                  tool: toolName,
                  result: toolResult.result,
                  timestamp: Date.now()
                };

                yield {
                  type: 'tool_status',
                  tool: toolName,
                  status: 'completed',
                  timestamp: Date.now()
                };
              } else {
                yield {
                  type: 'tool_status',
                  tool: toolName,
                  status: 'failed',
                  timestamp: Date.now()
                };

                yield {
                  type: 'error',
                  error: `Tool execution failed: ${toolResult.error}`,
                  timestamp: Date.now()
                };
              }
            } catch (error) {
              yield {
                type: 'error',
                error: `Failed to execute tool: ${error}`,
                timestamp: Date.now()
              };
            }
          }
        }

        if (chunk.type === 'message_stop') {
          break;
        }
      }

      yield {
        type: 'done',
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now()
      };
    }
  }

  private prepareMessages(message: string, context?: ChatContext) {
    const systemPrompt = `You are an AI coding assistant for Veltris Codex. You help with code generation, analysis, refactoring, and documentation.

Available tools:
- generate_code_diff: Compare two versions of code
- generate_documentation: Create BRD, SRD, README, or API docs
- analyze_code_structure: Analyze code patterns and structure
- refactor_code: Refactor code with specific strategies

Use tools when appropriate to help users with their coding tasks. Always provide helpful explanations along with tool results.`;

    const messages: Anthropic.Messages.MessageParam[] = [];

    // Add context if provided
    if (context) {
      let contextMessage = 'Current context:\n';
      
      if (context.filePath) {
        contextMessage += `File: ${context.filePath}\n`;
      }
      
      if (context.codeContent) {
        contextMessage += `Code:\n\`\`\`\n${context.codeContent}\n\`\`\`\n`;
      }
      
      if (context.projectStructure) {
        contextMessage += `Project structure:\n${context.projectStructure}\n`;
      }

      messages.push({
        role: 'user',
        content: contextMessage
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message
    });

    return { messages, systemPrompt };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple test call to check if the API key is valid
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      return true;
    } catch {
      return false;
    }
  }
}