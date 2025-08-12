"""Code analysis service."""
import ast
import re
from typing import List, Optional

from src.models.tools import (
    CodeAnalysisParams,
    CodeAnalysisResult,
    CodeStructure,
    CodeMetrics,
)


class CodeAnalyzer:
    """Service for analyzing code structure and quality."""

    async def analyze_code(self, params: CodeAnalysisParams) -> CodeAnalysisResult:
        """Analyze code structure and provide insights."""
        code = params.code_content
        file_path = params.file_path
        
        # Determine language from file extension
        language = self._detect_language(file_path)
        
        if language == "python":
            return await self._analyze_python_code(code, file_path)
        else:
            return await self._analyze_generic_code(code, file_path)

    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        extension = file_path.split(".")[-1].lower()
        
        language_map = {
            "py": "python",
            "js": "javascript",
            "ts": "typescript",
            "jsx": "javascript",
            "tsx": "typescript",
            "java": "java",
            "cpp": "cpp",
            "c": "c",
            "cs": "csharp",
            "go": "go",
            "rs": "rust",
            "php": "php",
            "rb": "ruby",
            "swift": "swift",
            "kt": "kotlin",
        }
        
        return language_map.get(extension, "generic")

    async def _analyze_python_code(self, code: str, file_path: str) -> CodeAnalysisResult:
        """Analyze Python code using AST."""
        try:
            tree = ast.parse(code)
            
            # Extract structure using AST
            structure = self._extract_python_structure(tree)
            
            # Calculate metrics
            metrics = self._calculate_python_metrics(tree, code)
            
            # Generate suggestions
            suggestions = self._generate_python_suggestions(tree, code)
            
            # Detect patterns
            patterns = self._detect_python_patterns(tree, code, file_path)
            
            return CodeAnalysisResult(
                structure=structure,
                metrics=metrics,
                suggestions=suggestions,
                patterns=patterns
            )
            
        except SyntaxError:
            # Fallback to generic analysis if Python parsing fails
            return await self._analyze_generic_code(code, file_path)

    def _extract_python_structure(self, tree: ast.AST) -> CodeStructure:
        """Extract Python code structure using AST."""
        functions = []
        classes = []
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append(node.name)
            elif isinstance(node, ast.AsyncFunctionDef):
                functions.append(f"async {node.name}")
            elif isinstance(node, ast.ClassDef):
                classes.append(node.name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
        
        # Python doesn't have explicit exports, so we'll identify public functions/classes
        exports = [name for name in functions + classes if not name.startswith('_')]
        
        return CodeStructure(
            functions=functions,
            classes=classes,
            imports=imports,
            exports=exports
        )

    def _calculate_python_metrics(self, tree: ast.AST, code: str) -> CodeMetrics:
        """Calculate code metrics for Python code."""
        lines = [line.strip() for line in code.split('\n') if line.strip()]
        lines_of_code = len(lines)
        
        # Calculate cyclomatic complexity
        complexity = self._calculate_cyclomatic_complexity(tree)
        
        # Calculate maintainability score
        maintainability = self._calculate_maintainability_score(
            lines_of_code, complexity, len(self._extract_python_structure(tree).functions)
        )
        
        return CodeMetrics(
            lines_of_code=lines_of_code,
            complexity=complexity,
            maintainability_score=maintainability
        )

    def _calculate_cyclomatic_complexity(self, tree: ast.AST) -> int:
        """Calculate cyclomatic complexity for Python AST."""
        complexity = 1  # Base complexity
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(node, ast.ExceptHandler):
                complexity += 1
            elif isinstance(node, ast.With, ast.AsyncWith):
                complexity += 1
            elif isinstance(node, ast.BoolOp):
                complexity += len(node.values) - 1
        
        return complexity

    def _generate_python_suggestions(self, tree: ast.AST, code: str) -> List[str]:
        """Generate improvement suggestions for Python code."""
        suggestions = []
        
        # Check for long functions
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if hasattr(node, 'end_lineno') and hasattr(node, 'lineno'):
                    lines = node.end_lineno - node.lineno
                    if lines > 50:
                        suggestions.append(f"Function '{node.name}' is too long ({lines} lines). Consider breaking it down.")
        
        # Check for missing docstrings
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
                if not ast.get_docstring(node):
                    suggestions.append(f"Add docstring to {node.__class__.__name__.lower()} '{node.name}'")
        
        # Check for TODO/FIXME comments
        if "# TODO" in code or "# FIXME" in code:
            suggestions.append("Address TODO and FIXME comments")
        
        # Check for exception handling
        has_try_except = any(isinstance(node, ast.Try) for node in ast.walk(tree))
        has_async = any(isinstance(node, ast.AsyncFunctionDef) for node in ast.walk(tree))
        
        if has_async and not has_try_except:
            suggestions.append("Consider adding error handling for async operations")
        
        # Check for type hints
        functions_without_types = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not node.returns and node.name != "__init__":
                    functions_without_types.append(node.name)
        
        if functions_without_types:
            suggestions.append("Consider adding type hints to improve code clarity")
        
        return suggestions

    def _detect_python_patterns(self, tree: ast.AST, code: str, file_path: str) -> List[str]:
        """Detect Python patterns and frameworks."""
        patterns = []
        
        # Check for common frameworks
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
        
        # Framework detection
        if any("django" in imp for imp in imports):
            patterns.append("Django Framework")
        if any("flask" in imp for imp in imports):
            patterns.append("Flask Framework")
        if any("fastapi" in imp for imp in imports):
            patterns.append("FastAPI Framework")
        if any("pytest" in imp for imp in imports):
            patterns.append("pytest Testing")
        if any("numpy" in imp for imp in imports):
            patterns.append("NumPy Data Processing")
        if any("pandas" in imp for imp in imports):
            patterns.append("Pandas Data Analysis")
        if any("asyncio" in imp for imp in imports):
            patterns.append("Asyncio Async Programming")
        
        # Pattern detection
        if any(isinstance(node, ast.ClassDef) for node in ast.walk(tree)):
            patterns.append("Object-Oriented Programming")
        
        if any(isinstance(node, ast.AsyncFunctionDef) for node in ast.walk(tree)):
            patterns.append("Async/Await Pattern")
        
        if any(isinstance(node, ast.With) for node in ast.walk(tree)):
            patterns.append("Context Manager Pattern")
        
        if any(isinstance(node, ast.ListComp) for node in ast.walk(tree)):
            patterns.append("List Comprehension")
        
        if any(isinstance(node, ast.Lambda) for node in ast.walk(tree)):
            patterns.append("Functional Programming")
        
        return patterns

    async def _analyze_generic_code(self, code: str, file_path: str) -> CodeAnalysisResult:
        """Analyze code using regex patterns for non-Python languages."""
        lines = [line.strip() for line in code.split('\n') if line.strip()]
        
        # Extract structure using regex
        structure = self._extract_generic_structure(code)
        
        # Calculate basic metrics
        metrics = CodeMetrics(
            lines_of_code=len(lines),
            complexity=self._calculate_generic_complexity(code),
            maintainability_score=self._calculate_maintainability_score(
                len(lines), self._calculate_generic_complexity(code), len(structure.functions)
            )
        )
        
        # Generate suggestions
        suggestions = self._generate_generic_suggestions(code)
        
        # Detect patterns
        patterns = self._detect_generic_patterns(code, file_path)
        
        return CodeAnalysisResult(
            structure=structure,
            metrics=metrics,
            suggestions=suggestions,
            patterns=patterns
        )

    def _extract_generic_structure(self, code: str) -> CodeStructure:
        """Extract code structure using regex patterns."""
        # Function patterns for various languages
        function_patterns = [
            r'function\s+(\w+)',  # JavaScript
            r'def\s+(\w+)',       # Python
            r'const\s+(\w+)\s*=\s*(?:async\s+)?\(',  # JavaScript arrow functions
            r'(\w+)\s*:\s*(?:async\s+)?\(',  # TypeScript
            r'(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)?(\w+)\s*\(',  # Java/C#
        ]
        
        # Class patterns
        class_patterns = [
            r'class\s+(\w+)',
            r'interface\s+(\w+)',
            r'struct\s+(\w+)',
            r'enum\s+(\w+)',
        ]
        
        # Import patterns
        import_patterns = [
            r'import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+[\'"`]([^\'"`]+)[\'"`]',
            r'from\s+(\w+)\s+import',
            r'#include\s*<([^>]+)>',
            r'using\s+(\w+);',
        ]
        
        functions = []
        classes = []
        imports = []
        
        for pattern in function_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            functions.extend(matches)
        
        for pattern in class_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            classes.extend(matches)
        
        for pattern in import_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            imports.extend(matches)
        
        # Extract exports (simplified)
        export_patterns = [
            r'export\s+(?:default\s+)?(?:class\s+(\w+)|function\s+(\w+)|const\s+(\w+))',
            r'module\.exports\s*=\s*(\w+)',
        ]
        
        exports = []
        for pattern in export_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    exports.extend([m for m in match if m])
                else:
                    exports.append(match)
        
        return CodeStructure(
            functions=list(set(functions)),
            classes=list(set(classes)),
            imports=list(set(imports)),
            exports=list(set(exports))
        )

    def _calculate_generic_complexity(self, code: str) -> int:
        """Calculate complexity using keyword counting."""
        complexity_keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?']
        complexity = 1
        
        for keyword in complexity_keywords:
            complexity += len(re.findall(rf'\b{keyword}\b', code, re.IGNORECASE))
        
        return complexity

    def _generate_generic_suggestions(self, code: str) -> List[str]:
        """Generate suggestions for generic code."""
        suggestions = []
        
        lines = code.split('\n')
        if len(lines) > 200:
            suggestions.append("File is quite large. Consider breaking it into smaller modules.")
        
        if 'TODO' in code or 'FIXME' in code:
            suggestions.append("Address TODO and FIXME comments")
        
        if not re.search(r'\/\*\*|\*\/|\/\/', code):
            suggestions.append("Add comments to improve code readability")
        
        # Check for console.log in JavaScript
        if re.search(r'console\.log\(', code):
            suggestions.append("Remove console.log statements before production")
        
        # Check for var usage in JavaScript
        if re.search(r'\bvar\s+', code):
            suggestions.append("Use const or let instead of var")
        
        return suggestions

    def _detect_generic_patterns(self, code: str, file_path: str) -> List[str]:
        """Detect patterns in generic code."""
        patterns = []
        
        # Language detection
        if file_path.endswith('.js') or file_path.endswith('.jsx'):
            patterns.append("JavaScript")
            if 'React' in code or 'import React' in code:
                patterns.append("React Framework")
            if 'useState' in code or 'useEffect' in code:
                patterns.append("React Hooks")
        
        if file_path.endswith('.ts') or file_path.endswith('.tsx'):
            patterns.append("TypeScript")
            if 'interface' in code:
                patterns.append("TypeScript Interfaces")
        
        if 'async' in code and 'await' in code:
            patterns.append("Async/Await Pattern")
        
        if 'class' in code:
            patterns.append("Object-Oriented Programming")
        
        if 'express' in code or 'app.get' in code:
            patterns.append("Express.js")
        
        return patterns

    def _calculate_maintainability_score(self, loc: int, complexity: int, function_count: int) -> float:
        """Calculate maintainability score."""
        base_score = 100.0
        
        # Penalty for lines of code
        loc_penalty = min(loc / 10, 30)
        
        # Penalty for complexity
        complexity_penalty = min(complexity * 2, 40)
        
        # Bonus for modular functions
        function_bonus = min(function_count * 2, 20)
        
        score = base_score - loc_penalty - complexity_penalty + function_bonus
        return max(0.0, min(100.0, score))


# Global service instance
code_analyzer = CodeAnalyzer()