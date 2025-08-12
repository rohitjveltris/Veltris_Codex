import { DocumentationParams, DocumentationResult } from '@/types/tools.js';

const DOC_TEMPLATES = {
  BRD: {
    title: 'Business Requirements Document',
    sections: [
      'Executive Summary',
      'Business Objectives',
      'Scope and Deliverables',
      'Functional Requirements',
      'Non-Functional Requirements',
      'Assumptions and Dependencies',
      'Success Criteria'
    ]
  },
  SRD: {
    title: 'Software Requirements Document',
    sections: [
      'Introduction',
      'System Overview',
      'Functional Requirements',
      'Technical Requirements',
      'System Architecture',
      'Interface Requirements',
      'Data Requirements',
      'Security Requirements',
      'Performance Requirements'
    ]
  },
  README: {
    title: 'README Documentation',
    sections: [
      'Project Title',
      'Description',
      'Installation',
      'Usage',
      'Features',
      'API Documentation',
      'Contributing',
      'License'
    ]
  },
  API_DOCS: {
    title: 'API Documentation',
    sections: [
      'Overview',
      'Authentication',
      'Endpoints',
      'Request/Response Examples',
      'Error Codes',
      'Rate Limiting',
      'SDK Information'
    ]
  }
};

export const generateDocumentation = async (params: DocumentationParams): Promise<DocumentationResult> => {
  const { docType, projectContext, codeStructure } = params;
  
  const template = DOC_TEMPLATES[docType];
  if (!template) {
    throw new Error(`Unsupported documentation type: ${docType}`);
  }

  let content = `# ${template.title}\n\n`;
  
  // Add project context at the beginning
  content += `## Project Overview\n${projectContext}\n\n`;
  
  // Add code structure if provided
  if (codeStructure) {
    content += `## Code Structure\n${codeStructure}\n\n`;
  }

  // Generate content for each section based on doc type
  for (const section of template.sections) {
    content += `## ${section}\n\n`;
    content += generateSectionContent(docType, section, projectContext);
    content += '\n\n';
  }

  // Add footer
  content += `---\n*Generated on ${new Date().toISOString()}*\n`;

  return {
    content,
    docType,
    sections: template.sections,
    wordCount: content.split(/\s+/).length
  };
};

const generateSectionContent = (docType: string, section: string, context: string): string => {
  // This is a simplified implementation. In a real scenario, 
  // you might use AI to generate more sophisticated content
  
  const sectionTemplates: Record<string, Record<string, string>> = {
    README: {
      'Project Title': `# ${extractProjectName(context)}`,
      'Description': `${context}\n\nThis project provides [key functionality] with [main features].`,
      'Installation': '```bash\nnpm install\n# or\nyarn install\n```',
      'Usage': '```javascript\n// Basic usage example\nimport { Component } from \'./component\';\n\nconst app = new Component();\napp.start();\n```',
      'Features': '- Feature 1: [Description]\n- Feature 2: [Description]\n- Feature 3: [Description]',
      'API Documentation': 'See [API.md](./API.md) for detailed API documentation.',
      'Contributing': 'Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.',
      'License': 'This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.'
    },
    BRD: {
      'Executive Summary': `This document outlines the business requirements for ${extractProjectName(context)}.`,
      'Business Objectives': '- Objective 1: [Description]\n- Objective 2: [Description]',
      'Scope and Deliverables': 'The project scope includes:\n- [Deliverable 1]\n- [Deliverable 2]',
      'Functional Requirements': 'FR-001: [Requirement description]\nFR-002: [Requirement description]',
      'Non-Functional Requirements': 'NFR-001: Performance requirements\nNFR-002: Security requirements',
      'Assumptions and Dependencies': '- Assumption 1: [Description]\n- Dependency 1: [Description]',
      'Success Criteria': '- Criteria 1: [Measurable outcome]\n- Criteria 2: [Measurable outcome]'
    }
  };

  const docTemplates = sectionTemplates[docType];
  if (docTemplates && docTemplates[section]) {
    return docTemplates[section];
  }

  return `[Content for ${section} section - to be filled based on project requirements]`;
};

const extractProjectName = (context: string): string => {
  // Simple heuristic to extract project name from context
  const words = context.split(' ');
  return words.length > 0 ? words[0] : 'Project';
};