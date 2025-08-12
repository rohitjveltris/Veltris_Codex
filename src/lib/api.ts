
import { ChatRequest, HealthCheckResponse, ApiResponse } from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const getModels = async () => {
  try {
    const response = await fetch(`${API_URL}/api/models`);
    if (!response.ok) {
      console.error("Failed to fetch models:", response.status, response.statusText);
      return []; // Return empty array directly on error
    }
    const result = await response.json();
    // Ensure we extract the models array from the nested 'data' object
    if (result && result.data && Array.isArray(result.data.models)) {
      return result.data.models;
    } else {
      console.error("Unexpected API response structure for models:", result);
      return []; // Return empty array if structure is unexpected
    }
  } catch (error) {
    console.error("Error fetching models:", error);
    return []; // Return empty array on network error
  }
};

export const streamChat = async (payload: ChatRequest) => {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.body) {
    throw new Error("No response body");
  }
  return response.body;
};

export const getProjectStructure = async (workingDirectory: string | null) => {
  try {
    const response = await fetch(`${API_URL}/api/files/tree?workingDirectory=${encodeURIComponent(workingDirectory || '')}`);
    if (!response.ok) {
      console.error("Failed to fetch project structure:", response.status, response.statusText);
      return { result: { tree: [] } }; // Return empty tree on error
    }
    const data = await response.json();
    return data; // API returns { success: true, result: { tree: [...] } }
  } catch (error) {
    console.error("Error fetching project structure:", error);
    return { result: { tree: [] } }; // Return empty tree on network error
  }
};

export const getFileContent = async (filePath: string, workingDirectory: string | null) => {
  try {
    const response = await fetch(`${API_URL}/api/files/content?path=${encodeURIComponent(filePath)}&workingDirectory=${encodeURIComponent(workingDirectory || '')}`);
    if (!response.ok) {
      console.error(`Failed to fetch file content for ${filePath}:`, response.status, response.statusText);
      return { result: { content: `Error: Could not load file content for ${filePath}` } };
    }
    const data = await response.json();
    return data; // API returns { success: true, result: { content: "..." } }
  } catch (error) {
    console.error(`Error fetching file content for ${filePath}:`, error);
    return { result: { content: `Error: Could not load file content for ${filePath}` } };
  }
};

export const writeFile = async (filePath: string, content: string, workingDirectory: string | null) => {
  try {
    const response = await fetch(`${API_URL}/api/files/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath, content, workingDirectory }),
    });
    if (!response.ok) {
      console.error(`Failed to write file ${filePath}:`, response.status, response.statusText);
      return { success: false, message: `Error writing file: ${filePath}` };
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return { success: false, message: `Error writing file: ${filePath}` };
  }
};

export const checkHealthStatus = async (): Promise<HealthCheckResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increase timeout to 10 seconds
    
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    
    const result: ApiResponse<HealthCheckResponse> = await response.json();
    return result.data || {
      status: 'unhealthy',
      version: '1.0.0',
      uptime: 0,
      services: {
        gateway: false,
        ai_service: false,
        openai: false,
        anthropic: false,
      },
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Health check timed out - this is normal if AI services are starting up');
    } else {
      console.error('Health check failed:', error);
    }
    
    // Return unhealthy status on any error
    return {
      status: 'unhealthy',
      version: '1.0.0',
      uptime: 0,
      services: {
        gateway: false,
        ai_service: false,
        openai: false,
        anthropic: false,
      },
    };
  }
};
