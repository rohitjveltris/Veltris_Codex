import asyncio
from datetime import datetime
from typing import Dict, List, Any

from src.models.tools import DocumentationParams, MultiDocumentationParams, DocumentationResult, DocType
from src.services.tools.file_system import write_file


class DocumentationService:
    """Service for generating technical documentation."""

    def __init__(self, openai_provider: Any, claude_provider: Any):
        self.openai_provider = openai_provider
        self.claude_provider = claude_provider
        self.doc_templates = {
            DocType.BRD: {
                "title": "Business Requirements Document",
                "sections": [
                    "Executive Summary",
                    "Business Objectives",
                    "Scope and Deliverables",
                    "Functional Requirements",
                    "Non-Functional Requirements",
                    "Assumptions and Dependencies",
                    "Success Criteria"
                ]
            },
            DocType.SRD: {
                "title": "Software Requirements Document",
                "sections": [
                    "Introduction",
                    "System Overview",
                    "Functional Requirements",
                    "Technical Requirements",
                    "System Architecture",
                    "Interface Requirements",
                    "Data Requirements",
                    "Security Requirements",
                    "Performance Requirements"
                ]
            },
            DocType.README: {
                "title": "README Documentation",
                "sections": [
                    "Project Title",
                    "Description",
                    "Installation",
                    "Usage",
                    "Features",
                    "API Documentation",
                    "Contributing",
                    "License"
                ]
            },
            DocType.API_DOCS: {
                "title": "API Documentation",
                "sections": [
                    "Overview",
                    "Authentication",
                    "Endpoints",
                    "Request/Response Examples",
                    "Error Codes",
                    "Rate Limiting",
                    "SDK Information"
                ]
            }
        }

    async def generate_multiple_documentation(self, params: MultiDocumentationParams, working_directory: str = None) -> List[Dict]:
        """Generate multiple types of documentation in parallel."""
        print(f"DEBUG: Generating multiple documentation in working directory: {working_directory}")
        
        async def generate_and_write_doc(doc_type: DocType) -> Dict:
            try:
                single_params = DocumentationParams(
                    doc_type=doc_type,
                    project_context=params.project_context,
                    code_structure=params.code_structure
                )
                
                doc_result = await self.generate_documentation(single_params);
                
                file_name = f"generated_docs/{doc_type.value}.md"
                write_result = await write_file(file_name, doc_result.content, working_directory)
                
                return {
                    "doc_type": doc_type.value,
                    "file_path": file_name,
                    "success": write_result["success"],
                    "message": write_result["message"],
                    "word_count": doc_result.word_count
                }
            except Exception as e:
                return {
                    "doc_type": doc_type.value,
                    "file_path": f"generated_docs/{doc_type.value}.md",
                    "success": False,
                    "message": f"Failed to generate {doc_type.value}: {str(e)}",
                    "word_count": 0
                }

        tasks = [generate_and_write_doc(doc_type) for doc_type in params.doc_types]
        results = await asyncio.gather(*tasks)
        return results

    async def generate_documentation(self, params: DocumentationParams) -> DocumentationResult:
        """Generate technical documentation with a single API call."""
        template = self.doc_templates.get(params.doc_type)
        if not template:
            raise ValueError(f"Unsupported documentation type: {params.doc_type}")

        provider = self.openai_provider or self.claude_provider
        if not provider:
            raise ConnectionError("No AI provider is configured.")

        # Construct a single, comprehensive prompt
        sections_formatted = "\n".join([f"- {s}" for s in template["sections"]])
        code_structure_prompt = f"\nCode Structure:\n```\n{params.code_structure}\n```" if params.code_structure else ""

        prompt = f"""Please generate a complete '{template['title']}' document.

**Project Context:**
{params.project_context}
{code_structure_prompt}

**Instructions:**
1.  Generate content for all the following sections:
{sections_formatted}
2.  Format the entire output as a single, well-structured Markdown document.
3.  Ensure the content is professional, detailed, and directly relevant to the project context.
4.  Start directly with the document title (`# {template['title']}`).
"""

        try:
            # Make a single call to the AI provider for the entire document
            full_content = await provider.generate_text(prompt)
            
            # Add a footer
            full_content += f"\n\n---\n*Generated on {datetime.now().isoformat()}*\n"

            return DocumentationResult(
                content=full_content,
                doc_type=params.doc_type.value,
                sections=template["sections"],
                word_count=len(full_content.split())
            )
        except Exception as e:
            raise RuntimeError(f"Failed to generate documentation from AI provider: {e}")