import { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { streamChat, writeFile, getFileContent } from '@/lib/api';

export const useAIChat = () => {
  const { selectedModel, activeFile, activeFileContent, dispatch, workingDirectory } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (
    message: string, 
    toolCall?: { tool_name: string; parameters: any },
    referencedFiles?: string[]
  ) => {
    if (!selectedModel) {
      // Handle no model selected
      return;
    }

    setIsLoading(true);
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { type: 'user', content: message, timestamp: new Date() } });
    // Don't add empty assistant message immediately - wait for AI response

    try {
      // Fetch content for referenced files
      let referencedFileContents: Record<string, string> = {};
      console.log("useAIChat: Referenced files to fetch:", referencedFiles);
      if (referencedFiles && referencedFiles.length > 0) {
        for (const filePath of referencedFiles) {
          try {
            console.log(`useAIChat: Fetching content for ${filePath}`);
            const fileData = await getFileContent(filePath, workingDirectory);
            console.log(`useAIChat: Received file data for ${filePath}:`, fileData);
            referencedFileContents[filePath] = fileData.result.content;
          } catch (error) {
            console.error(`Failed to fetch content for ${filePath}:`, error);
            referencedFileContents[filePath] = `Error: Could not load file content`;
          }
        }
      }
      console.log("useAIChat: Final referenced file contents:", referencedFileContents);

      const requestBody: any = {
        message,
        model: selectedModel.id,
        context: {
          file_path: activeFile || undefined,
          code_content: activeFileContent || undefined,
          referenced_files: referencedFileContents, // Include referenced file contents
          working_directory: workingDirectory,
        },
      };
      
      console.log("useAIChat: Final request body:", JSON.stringify(requestBody, null, 2));

      if (toolCall) {
        requestBody.tool_call = toolCall;
      }

      const stream = await streamChat(requestBody);

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let hasAddedAssistantMessage = false;
      
      const ensureAssistantMessage = (content: string) => {
        if (!hasAddedAssistantMessage) {
          dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { type: 'assistant', content, timestamp: new Date() } });
          hasAddedAssistantMessage = true;
        } else {
          dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: content });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'ai_chunk') {
              assistantMessage += data.content;
              ensureAssistantMessage(assistantMessage);
            } else if (data.type === 'tool_code') {
              // Display tool code in chat
              const toolCodeMessage = assistantMessage + "\n\n```json\n" + JSON.stringify(data.tool_code, null, 2) + "\n```";
              ensureAssistantMessage(toolCodeMessage);
            } else if (data.type === 'tool_result') {
              // Handle tool results
              if (data.tool === 'generate_documentation') {
                const docContent = data.result.content;
                const docType = data.result.doc_type; // Assuming doc_type is returned
                const fileName = `generated_docs/${docType || 'document'}.md`;
                const writeResult = await writeFile(fileName, docContent, workingDirectory);
                if (writeResult.success) {
                  ensureAssistantMessage(assistantMessage + `\n\nGenerated ${docType} and saved to ${fileName}`);
                } else {
                  ensureAssistantMessage(assistantMessage + `\n\nFailed to save ${docType}: ${writeResult.message}`);
                }
              } else if (data.tool === 'generate_multiple_documentation') {
                const results = data.result.results; // Array of documentation results
                if (Array.isArray(results)) {
                  const successfulDocs = results.filter(result => result.success);
                  const failedDocs = results.filter(result => !result.success);
                  
                  let message = '';
                  
                  if (successfulDocs.length > 0) {
                    message += `\n\nGenerated ${successfulDocs.length} documentation file(s):`;
                    successfulDocs.forEach(result => {
                      message += `\n• ${result.doc_type} (${result.word_count} words) - saved to ${result.file_path}`;
                    });
                  }
                  
                  if (failedDocs.length > 0) {
                    message += `\n\nFailed to generate ${failedDocs.length} documentation file(s):`;
                    failedDocs.forEach(result => {
                      message += `\n• ${result.doc_type}: ${result.message}`;
                    });
                  }
                  
                  ensureAssistantMessage(assistantMessage + message);
                } else {
                  ensureAssistantMessage(assistantMessage + `\n\nUnexpected response format for multiple documentation generation`);
                }
              } else if (data.tool === 'modify_file_with_diff') {
                // Handle file modification with diff - trigger approval modal
                const modificationResult = data.result;
                dispatch({ 
                  type: 'SET_DIFF_APPROVAL', 
                  payload: { 
                    isOpen: true, 
                    modificationResult: modificationResult 
                  } 
                });
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + `\n\n📝 Proposed changes to ${modificationResult.file_path}. Please review the diff and approve or reject the changes.` });
              } else if (data.tool === 'generate_code') {
                const codeResults = data.result; // Expecting a list of results
                if (Array.isArray(codeResults)) {
                  const successfulFiles = codeResults.filter(result => result.success);
                  const failedFiles = codeResults.filter(result => !result.success);
                  
                  let message = '';
                  
                  if (successfulFiles.length > 0) {
                    if (successfulFiles.length === 1) {
                      message += `\n\nCode generated successfully! Saved to ${successfulFiles[0].file_path}`;
                    } else {
                      message += `\n\nCode generated successfully for ${successfulFiles.length} files:`;
                      successfulFiles.forEach(result => {
                        message += `\n• ${result.file_path}`;
                      });
                    }
                  }
                  
                  if (failedFiles.length > 0) {
                    message += `\n\nFailed to generate ${failedFiles.length} file(s):`;
                    failedFiles.forEach(result => {
                      message += `\n• ${result.file_path}: ${result.message}`;
                    });
                  }
                  
                  ensureAssistantMessage(assistantMessage + message);
                } else {
                  // Fallback for single result if structure is not an array
                  const codeResult = codeResults;
                  if (codeResult.success) {
                    let message = `\n\nCode generated successfully!`;
                    if (codeResult.file_path) {
                      message += ` Saved to ${codeResult.file_path}`;
                    } else if (codeResult.code) {
                      message += "\n```\n" + codeResult.code + "\n```";
                    }
                    ensureAssistantMessage(assistantMessage + message);
                  } else {
                    dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + `\n\nFailed to generate code: ${codeResult.message}` });
                  }
                }
              } else if (data.tool === 'refactor_code') {
                const refactorResult = data.result;
                let message = '\n\n## Code Refactoring Complete\n\n';
                
                if (refactorResult.changes && refactorResult.changes.length > 0) {
                  message += `**Changes Applied (${refactorResult.refactor_type}):**\n`;
                  refactorResult.changes.forEach((change, index) => {
                    message += `${index + 1}. ${change.description}\n`;
                  });
                }
                
                if (refactorResult.improvements && refactorResult.improvements.length > 0) {
                  message += `\n**Improvements Made:**\n`;
                  refactorResult.improvements.forEach((improvement, index) => {
                    message += `${index + 1}. ${improvement}\n`;
                  });
                }
                
                if (!refactorResult.changes?.length && !refactorResult.improvements?.length) {
                  message += '✅ Your code is already well-optimized! No significant improvements were found.\n';
                } else {
                  message += `\n**Refactored Code:**\n\`\`\`python\n${refactorResult.refactored_code}\n\`\`\`\n`;
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'smart_code_action') {
                const actionResult = data.result;
                let message = '\n\n## Smart Code Action Complete\n\n';
                message += `**Action:** ${actionResult.action_request}\n`;
                message += `**Strategy Used:** ${actionResult.strategy_used?.strategy_type || 'Analysis'}\n\n`;
                
                if (actionResult.result?.type === 'refactor') {
                  const refactorData = actionResult.result;
                  if (refactorData.improvements?.length > 0) {
                    message += '**Improvements Made:**\n';
                    refactorData.improvements.forEach((improvement, index) => {
                      message += `${index + 1}. ${improvement}\n`;
                    });
                    message += `\n**Updated Code:**\n\`\`\`python\n${refactorData.refactored_code}\n\`\`\`\n`;
                  }
                } else if (actionResult.result?.type === 'security') {
                  const securityData = actionResult.result;
                  message += `**Security Analysis:**\n`;
                  message += `- Issues Found: ${securityData.security_issues?.length || 0}\n`;
                  message += `- Severity: ${securityData.severity}\n\n`;
                  if (securityData.suggestions?.length > 0) {
                    message += '**Security Recommendations:**\n';
                    securityData.suggestions.forEach((suggestion, index) => {
                      message += `${index + 1}. ${suggestion}\n`;
                    });
                  }
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'comprehensive_code_review') {
                const reviewResult = data.result;
                let message = '\n\n## Comprehensive Code Review\n\n';
                message += `**Overall Score:** ${reviewResult.overall_score?.toFixed(1) || 'N/A'}/100\n\n`;
                
                if (reviewResult.summary) {
                  const { critical, high, medium, low } = reviewResult.summary;
                  message += `**Issues Summary:**\n`;
                  message += `- Critical: ${critical || 0}\n`;
                  message += `- High: ${high || 0}\n`;
                  message += `- Medium: ${medium || 0}\n`;
                  message += `- Low: ${low || 0}\n\n`;
                }
                
                if (reviewResult.strengths?.length > 0) {
                  message += `**Code Strengths:**\n`;
                  reviewResult.strengths.forEach((strength, index) => {
                    message += `${index + 1}. ${strength}\n`;
                  });
                  message += '\n';
                }
                
                if (reviewResult.priority_fixes?.length > 0) {
                  message += `**Priority Fixes:**\n`;
                  reviewResult.priority_fixes.slice(0, 3).forEach((fix, index) => {
                    message += `${index + 1}. [${fix.severity.toUpperCase()}] ${fix.title}\n`;
                  });
                  message += '\n';
                }
                
                if (reviewResult.ai_insights?.length > 0) {
                  message += `**AI Insights:**\n`;
                  reviewResult.ai_insights.slice(0, 3).forEach((insight, index) => {
                    message += `${index + 1}. ${insight}\n`;
                  });
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'security_analysis') {
                const securityResult = data.result;
                let message = '\n\n## Security Analysis Report\n\n';
                message += `**Security Score:** ${securityResult.security_score?.toFixed(1) || 'N/A'}/100\n\n`;
                
                if (securityResult.summary) {
                  const { critical, high, medium, low } = securityResult.summary;
                  const totalIssues = critical + high + medium + low;
                  message += `**Vulnerabilities Found:** ${totalIssues}\n`;
                  if (totalIssues > 0) {
                    message += `- Critical: ${critical}\n`;
                    message += `- High: ${high}\n`;
                    message += `- Medium: ${medium}\n`;
                    message += `- Low: ${low}\n\n`;
                  }
                }
                
                if (securityResult.issues?.length > 0) {
                  message += `**Top Security Issues:**\n`;
                  securityResult.issues.slice(0, 5).forEach((issue, index) => {
                    message += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description} (Line ${issue.line_number})\n`;
                  });
                  message += '\n';
                }
                
                if (securityResult.recommendations?.length > 0) {
                  message += `**Security Recommendations:**\n`;
                  securityResult.recommendations.slice(0, 3).forEach((rec, index) => {
                    message += `${index + 1}. ${rec}\n`;
                  });
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'generate_tests') {
                const testResult = data.result;
                let message = '\n\n## 🧪 Test Generation Complete\n\n';
                
                if (testResult.test_cases?.length > 0) {
                  message += `**Generated Tests:** ${testResult.test_cases.length} test cases\n`;
                  message += `**Coverage Estimate:** ${testResult.coverage_estimate?.toFixed(1) || 'N/A'}%\n`;
                  message += `**Quality Score:** ${testResult.quality_score?.toFixed(1) || 'N/A'}/10\n`;
                  message += `**Framework:** ${testResult.framework}\n`;
                  message += `**Test File:** ${testResult.test_file_path}\n\n`;
                  
                  message += `**Test Types Generated:**\n`;
                  const testTypes = [...new Set(testResult.test_cases.map(tc => tc.test_type))];
                  testTypes.forEach(type => {
                    const count = testResult.test_cases.filter(tc => tc.test_type === type).length;
                    message += `- ${type}: ${count} tests\n`;
                  });
                  
                  if (testResult.mock_data?.length > 0) {
                    message += `\n**Mock Data:** ${testResult.mock_data.length} mock objects generated\n`;
                  }
                } else {
                  message += '⚠️ No test cases were generated. Please check your code structure and try again.\n';
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'analyze_testability') {
                const analysisResult = data.result;
                let message = '\n\n## 🔍 Testability Analysis Complete\n\n';
                
                message += `**Testability Score:** ${analysisResult.testability_score?.toFixed(1) || 'N/A'}/10\n`;
                message += `**Testable Functions:** ${analysisResult.testable_functions?.length || 0}\n`;
                message += `**Complex Functions:** ${analysisResult.complex_functions?.length || 0}\n`;
                message += `**Dependencies:** ${analysisResult.dependencies?.length || 0}\n\n`;
                
                if (analysisResult.recommendations?.length > 0) {
                  message += `**Recommendations:**\n`;
                  analysisResult.recommendations.slice(0, 5).forEach((rec, index) => {
                    message += `${index + 1}. ${rec}\n`;
                  });
                }
                
                if (analysisResult.coverage_gaps?.length > 0) {
                  message += `\n**Functions Needing Tests:**\n`;
                  analysisResult.coverage_gaps.slice(0, 5).forEach((func, index) => {
                    message += `- ${func}\n`;
                  });
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'generate_test_data_factory') {
                const factoryResult = data.result;
                let message = '\n\n## 🏭 Test Data Factory Generated\n\n';
                
                message += `**Factory Name:** ${factoryResult.factory_name}\n`;
                message += `**Language:** ${factoryResult.language}\n\n`;
                message += `**Generated Code:**\n\`\`\`${factoryResult.language}\n${factoryResult.code}\n\`\`\`\n`;
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else if (data.tool === 'analyze_coverage') {
                const coverageResult = data.result;
                let message = '\n\n## 📊 Coverage Analysis Complete\n\n';
                
                message += `**Current Coverage:** ${coverageResult.current_coverage?.toFixed(1) || 'N/A'}%\n`;
                message += `**Uncovered Functions:** ${coverageResult.uncovered_functions?.length || 0}\n\n`;
                
                if (coverageResult.suggested_tests?.length > 0) {
                  message += `**Suggested Tests:**\n`;
                  coverageResult.suggested_tests.slice(0, 5).forEach((test, index) => {
                    message += `${index + 1}. ${test}\n`;
                  });
                }
                
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + message });
              } else {
                // Handle other tool results
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: assistantMessage + `\n\nTool ${data.tool} executed with result: ${JSON.stringify(data.result)}` });
              }
            } else if (data.type === 'done') {
              // Stream finished
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error streaming chat:", error);
      // Ensure we add an error message even if no assistant message was added yet
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { type: 'assistant', content: 'An error occurred.', timestamp: new Date() } });
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading };
};