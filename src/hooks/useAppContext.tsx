
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { ConnectionState } from '@/types/api';

// State and Action Types
interface DiffApprovalState {
  isOpen: boolean;
  modificationResult: any | null;
}

interface AppState {
  availableModels: any[];
  selectedModel: any | null;
  modelsLoaded: boolean;
  projectStructure: any[];
  activeFile: string | null;
  activeFileContent: string | null;
  chatMessages: any[];
  showDocumentationModal: boolean;
  documentationSettings: {
    brd: boolean;
    srd: boolean;
    readme: boolean;
    api_docs: boolean;
  };
  showMultiCodeModal: boolean;
  showTestGenerationPanel: boolean;
  diffApproval: DiffApprovalState;
  connectionState: ConnectionState;
  workingDirectory: string | null;
}

interface AppContextProps extends AppState {
  dispatch: (action: Action) => void;
}

type Action =
  | { type: 'SET_MODELS'; payload: any[] }
  | { type: 'SELECT_MODEL'; payload: any }
  | { type: 'SET_MODELS_LOADED'; payload: boolean }
  | { type: 'SET_PROJECT_STRUCTURE'; payload: any[] }
  | { type: 'SET_ACTIVE_FILE'; payload: { path: string; content: string } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: any }
  | { type: 'UPDATE_LAST_CHAT_MESSAGE'; payload: string }
  | { type: 'SET_DOCUMENTATION_MODAL_VISIBILITY'; payload: boolean }
  | { type: 'SET_DOCUMENTATION_SETTINGS'; payload: { brd: boolean; srd: boolean; readme: boolean; api_docs: boolean; } }
  | { type: 'SET_MULTI_CODE_MODAL_VISIBILITY'; payload: boolean }
  | { type: 'SET_TEST_GENERATION_PANEL_VISIBILITY'; payload: boolean }
  | { type: 'SET_DIFF_APPROVAL'; payload: DiffApprovalState }
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'SET_WORKING_DIRECTORY'; payload: string | null };

// Reducer
const initialState: AppState = {
  availableModels: [],
  selectedModel: null,
  modelsLoaded: false,
  projectStructure: [],
  activeFile: null,
  activeFileContent: null,
  chatMessages: [],
  showDocumentationModal: false,
  documentationSettings: {
    brd: false,
    srd: false,
    readme: false,
    api_docs: false,
  },
  showMultiCodeModal: false,
  showTestGenerationPanel: false,
  diffApproval: {
    isOpen: false,
    modificationResult: null
  },
  connectionState: {
    status: 'checking',
    lastChecked: Date.now(),
    services: {
      gateway: false,
      ai_service: false,
      openai: false,
      anthropic: false,
    },
  },
  workingDirectory: null,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_MODELS':
      return { ...state, availableModels: action.payload };
    case 'SELECT_MODEL':
      return { ...state, selectedModel: action.payload };
    case 'SET_MODELS_LOADED':
      return { ...state, modelsLoaded: action.payload };
    case 'SET_PROJECT_STRUCTURE':
      return { ...state, projectStructure: action.payload };
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFile: action.payload.path, activeFileContent: action.payload.content };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'UPDATE_LAST_CHAT_MESSAGE':
      const updatedMessages = [...state.chatMessages];
      if (updatedMessages.length > 0) {
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: action.payload,
        };
      }
      return { ...state, chatMessages: updatedMessages };
    case 'SET_DOCUMENTATION_MODAL_VISIBILITY':
      return { ...state, showDocumentationModal: action.payload };
    case 'SET_DOCUMENTATION_SETTINGS':
      return { ...state, documentationSettings: action.payload };
    case 'SET_MULTI_CODE_MODAL_VISIBILITY':
      return { ...state, showMultiCodeModal: action.payload };
    case 'SET_TEST_GENERATION_PANEL_VISIBILITY':
      return { ...state, showTestGenerationPanel: action.payload };
    case 'SET_DIFF_APPROVAL':
      return { ...state, diffApproval: action.payload };
    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload };
    case 'SET_WORKING_DIRECTORY':
      return { ...state, workingDirectory: action.payload };
    default:
      return state;
  }
};

// Context
const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
