"""Code refactoring service."""
import re
from typing import List, Tuple

from src.models.tools import RefactorParams, RefactorResult, RefactorChange, RefactorType


class CodeRefactorService:
    """Service for refactoring code."""

    async def refactor_code(self, params: RefactorParams) -> RefactorResult:
        """Refactor code based on the specified type."""
        code = params.original_code
        refactor_type = params.refactor_type
        
        if refactor_type == RefactorType.OPTIMIZE:
            return await self._optimize_code(code)
        elif refactor_type == RefactorType.MODERNIZE:
            return await self._modernize_code(code)
        elif refactor_type == RefactorType.ADD_TYPES:
            return await self._add_types(code)
        elif refactor_type == RefactorType.EXTRACT_COMPONENTS:
            return await self._extract_components(code)
        else:
            raise ValueError(f"Unsupported refactor type: {refactor_type}")

    async def _optimize_code(self, code: str) -> RefactorResult:
        """Optimize code for better performance."""
        refactored_code = code
        changes: List[RefactorChange] = []
        improvements: List[str] = []
        
        # Remove console.log statements
        console_log_pattern = r'console\.log\([^)]*\);\s*'
        if re.search(console_log_pattern, refactored_code):
            refactored_code = re.sub(console_log_pattern, '', refactored_code)
            changes.append(RefactorChange(
                type="optimization",
                description="Removed console.log statements",
                line_number=0
            ))
            improvements.append("Removed debugging console.log statements")
        
        # Convert string concatenation to template literals
        concat_pattern = r'(\w+)\s*\+\s*[\'"`]([^\'"`]*)[\'"`]\s*\+\s*(\w+)'
        if re.search(concat_pattern, refactored_code):
            refactored_code = re.sub(concat_pattern, r'`${\1}\2${\3}`', refactored_code)
            changes.append(RefactorChange(
                type="optimization",
                description="Converted string concatenation to template literals",
                line_number=0
            ))
            improvements.append("Used template literals for better string interpolation")
        
        # Convert var to const/let
        var_pattern = r'\bvar\s+(\w+)'
        if re.search(var_pattern, refactored_code):
            refactored_code = re.sub(var_pattern, r'const \1', refactored_code)
            changes.append(RefactorChange(
                type="optimization",
                description="Replaced var declarations with const",
                line_number=0
            ))
            improvements.append("Used const/let instead of var for better scoping")
        
        # Remove unnecessary semicolons in Python
        if self._is_python_code(code):
            semicolon_pattern = r';(\s*\n)'
            if re.search(semicolon_pattern, refactored_code):
                refactored_code = re.sub(semicolon_pattern, r'\1', refactored_code)
                changes.append(RefactorChange(
                    type="optimization",
                    description="Removed unnecessary semicolons",
                    line_number=0
                ))
                improvements.append("Removed unnecessary semicolons in Python code")
        
        # Optimize Python list comprehensions
        if self._is_python_code(code):
            # Convert simple for loops to list comprehensions
            for_loop_pattern = r'(\w+)\s*=\s*\[\]\s*\n\s*for\s+(\w+)\s+in\s+([^:]+):\s*\n\s*\1\.append\(([^)]+)\)'
            if re.search(for_loop_pattern, refactored_code, re.MULTILINE):
                refactored_code = re.sub(
                    for_loop_pattern, 
                    r'\1 = [\4 for \2 in \3]', 
                    refactored_code, 
                    flags=re.MULTILINE
                )
                changes.append(RefactorChange(
                    type="optimization",
                    description="Converted for loop to list comprehension",
                    line_number=0
                ))
                improvements.append("Used list comprehension for better performance")
        
        return RefactorResult(
            refactored_code=refactored_code,
            changes=changes,
            improvements=improvements,
            refactor_type=RefactorType.OPTIMIZE.value
        )

    async def _modernize_code(self, code: str) -> RefactorResult:
        """Modernize code to use contemporary patterns."""
        refactored_code = code
        changes: List[RefactorChange] = []
        improvements: List[str] = []
        
        # Convert function declarations to arrow functions (JavaScript)
        function_pattern = r'function\s+(\w+)\s*\(([^)]*)\)\s*{'
        if re.search(function_pattern, refactored_code):
            refactored_code = re.sub(function_pattern, r'const \1 = (\2) => {', refactored_code)
            changes.append(RefactorChange(
                type="modernization",
                description="Converted function declarations to arrow functions",
                line_number=0
            ))
            improvements.append("Modernized to arrow function syntax")
        
        # Add destructuring for object access
        object_access_pattern = r'const\s+(\w+)\s*=\s*(\w+)\.(\w+);'
        if re.search(object_access_pattern, refactored_code):
            refactored_code = re.sub(object_access_pattern, r'const { \3: \1 } = \2;', refactored_code)
            changes.append(RefactorChange(
                type="modernization",
                description="Added object destructuring",
                line_number=0
            ))
            improvements.append("Used destructuring assignment for cleaner code")
        
        # Convert to f-strings in Python
        if self._is_python_code(code):
            format_pattern = r'["\']([^"\']*)\{\}([^"\']*)["\']\.format\(([^)]+)\)'
            if re.search(format_pattern, refactored_code):
                refactored_code = re.sub(format_pattern, r'f"\1{\3}\2"', refactored_code)
                changes.append(RefactorChange(
                    type="modernization",
                    description="Converted .format() to f-strings",
                    line_number=0
                ))
                improvements.append("Used f-strings for better string formatting")
        
        # Convert to pathlib in Python
        if self._is_python_code(code):
            if 'os.path' in refactored_code:
                changes.append(RefactorChange(
                    type="modernization",
                    description="Consider using pathlib instead of os.path",
                    line_number=0
                ))
                improvements.append("Consider using pathlib for better path handling")
        
        # Suggest async/await over .then() chains
        if '.then(' in refactored_code and 'async' not in refactored_code:
            changes.append(RefactorChange(
                type="modernization",
                description="Consider converting to async/await pattern",
                line_number=0
            ))
            improvements.append("Consider using async/await instead of .then() chains")
        
        return RefactorResult(
            refactored_code=refactored_code,
            changes=changes,
            improvements=improvements,
            refactor_type=RefactorType.MODERNIZE.value
        )

    async def _add_types(self, code: str) -> RefactorResult:
        """Add type annotations to code."""
        refactored_code = code
        changes: List[RefactorChange] = []
        improvements: List[str] = []
        
        if self._is_python_code(code):
            # Add type hints to Python functions
            function_pattern = r'def\s+(\w+)\s*\(([^)]*)\)\s*:'
            matches = re.findall(function_pattern, refactored_code)
            
            for func_name, params in matches:
                if ':' not in params:  # No type hints yet
                    # Simple heuristic: if parameter is used with .length, assume List
                    if f'{params.strip()}.append(' in refactored_code:
                        typed_params = f'{params.strip()}: List[Any]'
                        refactored_code = refactored_code.replace(
                            f'def {func_name}({params}):',
                            f'def {func_name}({typed_params}) -> None:'
                        )
                        changes.append(RefactorChange(
                            type="typing",
                            description=f"Added type annotation for parameter {params.strip()}",
                            line_number=0
                        ))
            
            # Add import for typing
            if 'List[' in refactored_code and 'from typing import' not in refactored_code:
                refactored_code = 'from typing import List, Any, Optional\n\n' + refactored_code
                changes.append(RefactorChange(
                    type="typing",
                    description="Added typing imports",
                    line_number=1
                ))
                improvements.append("Added typing imports for better type safety")
        
        else:
            # TypeScript/JavaScript type additions
            # Add basic parameter types
            function_param_pattern = r'\(([^)]+)\)\s*=>\s*{'
            matches = re.findall(function_param_pattern, refactored_code)
            
            for params in matches:
                if ':' not in params:  # No type annotations yet
                    # Simple heuristic: if parameter is used with .length, assume string/array
                    if f'{params.strip()}.length' in refactored_code:
                        typed_params = f'{params.strip()}: string | any[]'
                        refactored_code = refactored_code.replace(
                            f'({params}) =>',
                            f'({typed_params}) =>'
                        )
                        changes.append(RefactorChange(
                            type="typing",
                            description=f"Added type annotation for parameter {params.strip()}",
                            line_number=0
                        ))
            
            # Add interface for objects with props
            if 'props.' in refactored_code and 'interface' not in refactored_code:
                interface_definition = '''interface Props {
  // Add prop type definitions here
}

'''
                refactored_code = interface_definition + refactored_code
                changes.append(RefactorChange(
                    type="typing",
                    description="Added Props interface template",
                    line_number=1
                ))
                improvements.append("Added TypeScript interface for better type safety")
        
        if not changes:
            improvements.append("Consider adding type annotations for better code clarity")
        
        return RefactorResult(
            refactored_code=refactored_code,
            changes=changes,
            improvements=improvements,
            refactor_type=RefactorType.ADD_TYPES.value
        )

    async def _extract_components(self, code: str) -> RefactorResult:
        """Extract reusable components from code."""
        refactored_code = code
        changes: List[RefactorChange] = []
        improvements: List[str] = []
        
        # Detect repeated JSX patterns
        jsx_pattern = r'<(\w+)[^>]*>.*?</\1>'
        jsx_matches = re.findall(jsx_pattern, refactored_code, re.DOTALL)
        
        if jsx_matches:
            # Count occurrences of each element
            element_counts = {}
            for element in jsx_matches:
                element_counts[element] = element_counts.get(element, 0) + 1
            
            # Suggest extraction for repeated elements
            for element, count in element_counts.items():
                if count > 2 and element not in ['div', 'span', 'p', 'h1', 'h2', 'h3']:
                    improvements.append(f"Consider extracting repeated <{element}> elements into a reusable component")
                    changes.append(RefactorChange(
                        type="extraction",
                        description=f"Found {count} instances of <{element}> that could be extracted",
                        line_number=0
                    ))
        
        # Detect long functions in Python
        if self._is_python_code(code):
            function_pattern = r'def\s+(\w+)\s*\([^)]*\):\s*(.*?)(?=\ndef|\nclass|\Z)'
            matches = re.findall(function_pattern, refactored_code, re.DOTALL)
            
            for func_name, body in matches:
                line_count = len(body.split('\n'))
                if line_count > 20:
                    improvements.append(f"Function '{func_name}' is too long ({line_count} lines). Consider breaking it down.")
                    changes.append(RefactorChange(
                        type="extraction",
                        description=f"Function '{func_name}' has {line_count} lines and could be refactored",
                        line_number=0
                    ))
        
        # Detect long functions in JavaScript/TypeScript
        else:
            function_pattern = r'(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*)\s*{\s*(.*?)\s*}'
            matches = re.findall(function_pattern, refactored_code, re.DOTALL)
            
            for body in matches:
                line_count = len(body.split('\n'))
                if line_count > 20:
                    improvements.append(f"Function has {line_count} lines. Consider breaking it down into smaller functions.")
                    changes.append(RefactorChange(
                        type="extraction",
                        description=f"Function has {line_count} lines and could be refactored",
                        line_number=0
                    ))
        
        # Suggest extracting custom hooks for React
        if 'useState' in refactored_code and 'useEffect' in refactored_code:
            improvements.append("Consider extracting complex state logic into custom hooks")
            changes.append(RefactorChange(
                type="extraction",
                description="Complex state management detected - consider custom hooks",
                line_number=0
            ))
        
        # Suggest extracting utility functions
        if len(refactored_code.split('\n')) > 100:
            improvements.append("Large file detected. Consider extracting utility functions into separate modules.")
            changes.append(RefactorChange(
                type="extraction",
                description="File is large and could benefit from modularization",
                line_number=0
            ))
        
        return RefactorResult(
            refactored_code=refactored_code,
            changes=changes,
            improvements=improvements,
            refactor_type=RefactorType.EXTRACT_COMPONENTS.value
        )

    def _is_python_code(self, code: str) -> bool:
        """Check if code is Python based on syntax patterns."""
        python_indicators = [
            'def ', 'import ', 'from ', 'class ', 'if __name__',
            'print(', 'len(', 'range(', 'enumerate(', 'zip(',
            'with open(', 'try:', 'except:', 'finally:',
            'elif ', 'None', 'True', 'False'
        ]
        
        return any(indicator in code for indicator in python_indicators)


# Global service instance
code_refactor_service = CodeRefactorService()