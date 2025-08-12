import OpenAI from 'openai';
import { appConfig } from '@/config.js';
import { AI_TOOLS } from '@/types/tools.js';
import { StreamMessage } from '@/types/streaming.js';
import { toolExecutor, ToolFunction } from '@/services/toolExecutor.js';

export interface ChatContext {
  filePath?: string;
  codeContent?: string;
  projectStructure?: string;
}

export class OpenAIProvider {
  private client: OpenAI;

  constructor() {
    if (!appConfig.openaiApiKey) {
      throw new Error('OpenAI API key not provided');
    }
    
    this.client = new OpenAI({
      apiKey: appConfig.openaiApiKey
    });
  }

  async *streamChat(message: string, context?: ChatContext): AsyncGenerator<StreamMessage> {
    try {
      // Prepare messages with context
      const messages = this.prepareMessages(message, context);

      // Create completion with function calling
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: AI_TOOLS.map(tool => ({ type: 'function' as const, function: tool })),
        tool_choice: 'auto',
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      });

      let currentToolCall: any = null;
      let toolCallContent = '';

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;

        // Handle regular text content
        if (delta?.content) {
          yield {
            type: 'ai_chunk',
            content: delta.content,
            timestamp: Date.now()
          };
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              // New tool call starting
              currentToolCall = {
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: ''
              };
              
              yield {
                type: 'tool_status',
                tool: toolCall.function.name,
                status: 'executing',
                timestamp: Date.now()
              };
            }

            if (toolCall.function?.arguments && currentToolCall) {
              currentToolCall.arguments += toolCall.function.arguments;
            }
          }
        }

        // Check if tool call is complete
        if (chunk.choices[0]?.finish_reason === 'tool_calls' && currentToolCall) {
          try {
            const args = JSON.parse(currentToolCall.arguments);
            const toolResult = await toolExecutor.executeTool(
              currentToolCall.name as ToolFunction,
              args
            );

            if (toolResult.success) {
              yield {
                type: 'tool_result',
                tool: currentToolCall.name,
                result: toolResult.result,
                timestamp: Date.now()
              };

              yield {
                type: 'tool_status',
                tool: currentToolCall.name,
                status: 'completed',
                timestamp: Date.now()
              };
            } else {
              yield {
                type: 'tool_status',
                tool: currentToolCall.name,
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
              type: 'tool_status',
              tool: currentToolCall.name,
              status: 'failed',
              timestamp: Date.now()
            };

            yield {
              type: 'error',
              error: `Failed to parse tool arguments: ${error}`,
              timestamp: Date.now()
            };
          }

          currentToolCall = null;
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

  private prepareMessages(message: string, context?: ChatContext): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an AI coding assistant for Veltris Codex. You help with code generation, analysis, refactoring, and documentation.

Available tools:
- generate_code_diff: Compare two versions of code
- generate_documentation: Create BRD, SRD, README, or API docs
- analyze_code_structure: Analyze code patterns and structure
- refactor_code: Refactor code with specific strategies

Use tools when appropriate to help users with their coding tasks. Always provide helpful explanations along with tool results.`
      }
    ];

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

    return messages;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}