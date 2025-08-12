"""Comprehensive code review service combining analysis, security, and AI insights."""
import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from src.models.tools import CodeAnalysisParams
from src.services.tools.code_analyzer import code_analyzer
from src.services.tools.security_analyzer import security_analyzer
from src.services.tools.file_system import read_file


@dataclass
class CodeReviewIssue:
    """Represents a code review issue."""
    severity: str  # "critical", "high", "medium", "low", "info"
    category: str  # "security", "performance", "maintainability", "style", "bug_risk"
    title: str
    description: str
    line_number: int
    code_snippet: str
    suggestion: str
    impact: str  # Description of impact if not fixed
    effort: str  # "low", "medium", "high" - effort to fix


@dataclass  
class CodeReviewResult:
    """Complete code review result."""
    overall_score: float  # 0-100 overall code quality score
    issues: List[CodeReviewIssue]
    summary: Dict[str, int]  # Count by severity
    strengths: List[str]  # Things the code does well
    priority_fixes: List[CodeReviewIssue]  # Top priority issues to fix
    recommendations: List[str]
    metrics: Dict[str, Any]  # Combined metrics from all analyzers
    ai_insights: List[str]  # AI-generated insights


class CodeReviewService:
    """Comprehensive code review service."""

    def __init__(self, openai_provider: Any, claude_provider: Any):
        self.openai_provider = openai_provider
        self.claude_provider = claude_provider

    async def perform_comprehensive_review(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform a comprehensive code review combining all analysis tools."""
        file_path = params.get("file_path")
        file_content = params.get("file_content")
        review_focus = params.get("review_focus", "all")  # "security", "performance", "maintainability", "all"
        
        if not file_path:
            raise ValueError("file_path is required")
        
        # Read file content if not provided
        if not file_content:
            file_data = await read_file(file_path)
            if not file_data.get("content"):
                raise ValueError(f"Could not read file: {file_path}")
            file_content = file_data["content"]
        
        # Perform all analyses
        analysis_params = CodeAnalysisParams(file_path=file_path, code_content=file_content)
        
        # Code structure and quality analysis
        code_analysis = await code_analyzer.analyze_code(analysis_params)
        
        # Security analysis
        security_analysis = await security_analyzer.analyze_security(analysis_params)
        
        # AI-powered insights
        ai_insights = await self._generate_ai_insights(file_content, file_path, code_analysis)
        
        # Combine all analyses into comprehensive review
        review_result = await self._combine_analyses(
            code_analysis, security_analysis, ai_insights, file_content, review_focus
        )
        
        return {
            "success": True,
            "file_path": file_path,
            "review_focus": review_focus,
            "overall_score": review_result.overall_score,
            "issues": [self._issue_to_dict(issue) for issue in review_result.issues],
            "summary": review_result.summary,
            "strengths": review_result.strengths,
            "priority_fixes": [self._issue_to_dict(issue) for issue in review_result.priority_fixes],
            "recommendations": review_result.recommendations,
            "metrics": review_result.metrics,
            "ai_insights": review_result.ai_insights
        }

    async def _generate_ai_insights(self, file_content: str, file_path: str, analysis_result: Any) -> List[str]:
        """Generate AI-powered insights about the code."""
        prompt = f"""You are a senior code reviewer. Analyze this code and provide specific, actionable insights.

FILE: {file_path}
METRICS:
- Lines of Code: {analysis_result.metrics.lines_of_code}
- Complexity: {analysis_result.metrics.complexity}
- Maintainability: {analysis_result.metrics.maintainability_score}/100

STRUCTURE:
- Functions: {', '.join(analysis_result.structure.functions)}
- Classes: {', '.join(analysis_result.structure.classes)}
- Patterns: {', '.join(analysis_result.patterns)}

CODE:
```
{file_content[:3000]}{'...' if len(file_content) > 3000 else ''}
```

Provide 3-5 specific, actionable insights about:
1. Code quality and best practices
2. Potential bugs or edge cases
3. Performance improvements
4. Maintainability enhancements
5. Design patterns or architectural suggestions

Format as a simple list of insights, each on a new line starting with "- ".
Focus on practical, implementable suggestions."""

        try:
            response = await self.openai_provider.generate_text(prompt)
            # Parse insights from response
            insights = []
            for line in response.split('\n'):
                line = line.strip()
                if line.startswith('- ') and len(line) > 5:
                    insights.append(line[2:])  # Remove "- " prefix
            
            return insights[:10]  # Limit to 10 insights
            
        except Exception as e:
            return [
                "Consider adding more comprehensive error handling",
                "Look for opportunities to extract reusable functions",
                "Ensure all edge cases are handled properly",
                "Consider adding unit tests for critical functions"
            ]

    async def _combine_analyses(
        self, 
        code_analysis: Any,
        security_analysis: Any, 
        ai_insights: List[str],
        file_content: str,
        review_focus: str
    ) -> CodeReviewResult:
        """Combine all analyses into a comprehensive review."""
        issues = []
        
        # Convert code analysis suggestions to review issues
        for suggestion in code_analysis.suggestions:
            severity = self._determine_severity_from_suggestion(suggestion)
            category = self._categorize_suggestion(suggestion)
            
            issues.append(CodeReviewIssue(
                severity=severity,
                category=category,
                title=suggestion[:100] + "..." if len(suggestion) > 100 else suggestion,
                description=suggestion,
                line_number=0,  # General suggestion
                code_snippet="",
                suggestion=self._generate_fix_suggestion(suggestion),
                impact=self._determine_impact(suggestion),
                effort=self._estimate_effort(suggestion)
            ))
        
        # Convert security issues to review issues
        for sec_issue in security_analysis.issues:
            issues.append(CodeReviewIssue(
                severity=sec_issue.severity,
                category="security",
                title=sec_issue.description,
                description=f"{sec_issue.description} ({sec_issue.category})",
                line_number=sec_issue.line_number,
                code_snippet=sec_issue.code_snippet,
                suggestion=sec_issue.recommendation,
                impact=f"Security vulnerability: {sec_issue.category}",
                effort=self._estimate_security_effort(sec_issue.severity)
            ))
        
        # Add performance and maintainability issues
        issues.extend(self._analyze_performance_issues(code_analysis, file_content))
        issues.extend(self._analyze_maintainability_issues(code_analysis, file_content))
        
        # Filter issues based on review focus
        if review_focus != "all":
            issues = [issue for issue in issues if issue.category == review_focus]
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(code_analysis, security_analysis, issues)
        
        # Generate summary
        summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for issue in issues:
            summary[issue.severity] += 1
        
        # Identify strengths
        strengths = self._identify_strengths(code_analysis, security_analysis, file_content)
        
        # Get priority fixes (critical and high severity)
        priority_fixes = [issue for issue in issues if issue.severity in ["critical", "high"]]
        priority_fixes = sorted(priority_fixes, key=lambda x: {"critical": 0, "high": 1}.get(x.severity, 2))
        
        # Generate comprehensive recommendations
        recommendations = self._generate_comprehensive_recommendations(
            code_analysis, security_analysis, issues
        )
        
        # Combine metrics
        metrics = {
            "code_quality": {
                "lines_of_code": code_analysis.metrics.lines_of_code,
                "complexity": code_analysis.metrics.complexity,
                "maintainability_score": code_analysis.metrics.maintainability_score
            },
            "security": {
                "security_score": security_analysis.security_score,
                "vulnerabilities_found": len(security_analysis.issues)
            },
            "structure": {
                "functions": len(code_analysis.structure.functions),
                "classes": len(code_analysis.structure.classes),
                "imports": len(code_analysis.structure.imports)
            }
        }
        
        return CodeReviewResult(
            overall_score=overall_score,
            issues=issues,
            summary=summary,
            strengths=strengths,
            priority_fixes=priority_fixes,
            recommendations=recommendations,
            metrics=metrics,
            ai_insights=ai_insights
        )

    def _determine_severity_from_suggestion(self, suggestion: str) -> str:
        """Determine severity level from suggestion text."""
        suggestion_lower = suggestion.lower()
        
        if any(word in suggestion_lower for word in ["critical", "security", "vulnerability", "unsafe"]):
            return "critical"
        elif any(word in suggestion_lower for word in ["error", "exception", "bug", "fail"]):
            return "high"
        elif any(word in suggestion_lower for word in ["performance", "slow", "optimize"]):
            return "medium"
        elif any(word in suggestion_lower for word in ["style", "format", "comment", "doc"]):
            return "low"
        else:
            return "medium"

    def _categorize_suggestion(self, suggestion: str) -> str:
        """Categorize suggestion by type."""
        suggestion_lower = suggestion.lower()
        
        if any(word in suggestion_lower for word in ["security", "vulnerability", "unsafe"]):
            return "security"
        elif any(word in suggestion_lower for word in ["performance", "slow", "optimize", "memory"]):
            return "performance"
        elif any(word in suggestion_lower for word in ["maintain", "complex", "long", "break"]):
            return "maintainability"
        elif any(word in suggestion_lower for word in ["style", "format", "convention"]):
            return "style"
        elif any(word in suggestion_lower for word in ["bug", "error", "exception"]):
            return "bug_risk"
        else:
            return "maintainability"

    def _generate_fix_suggestion(self, suggestion: str) -> str:
        """Generate a specific fix suggestion."""
        suggestion_lower = suggestion.lower()
        
        if "docstring" in suggestion_lower:
            return "Add descriptive docstrings following standard conventions (Google, Sphinx, or NumPy style)"
        elif "long" in suggestion_lower and "function" in suggestion_lower:
            return "Break down large functions into smaller, focused functions with clear responsibilities"
        elif "type" in suggestion_lower:
            return "Add type hints to improve code clarity and enable better IDE support"
        elif "error" in suggestion_lower:
            return "Add proper try-catch blocks and meaningful error handling"
        elif "todo" in suggestion_lower:
            return "Address TODO/FIXME comments or remove them if no longer relevant"
        else:
            return "Review and implement the suggested improvement"

    def _determine_impact(self, suggestion: str) -> str:
        """Determine the impact if suggestion is not addressed."""
        suggestion_lower = suggestion.lower()
        
        if "security" in suggestion_lower:
            return "Potential security vulnerabilities and data exposure"
        elif "performance" in suggestion_lower:
            return "Reduced application performance and user experience"
        elif "maintain" in suggestion_lower:
            return "Increased development time and harder bug fixes"
        elif "error" in suggestion_lower:
            return "Potential runtime failures and poor error handling"
        else:
            return "Reduced code quality and team productivity"

    def _estimate_effort(self, suggestion: str) -> str:
        """Estimate effort required to fix the issue."""
        suggestion_lower = suggestion.lower()
        
        if any(word in suggestion_lower for word in ["refactor", "break", "extract", "restructure"]):
            return "high"
        elif any(word in suggestion_lower for word in ["add", "include", "implement"]):
            return "medium"  
        elif any(word in suggestion_lower for word in ["remove", "fix", "address", "format"]):
            return "low"
        else:
            return "medium"

    def _estimate_security_effort(self, severity: str) -> str:
        """Estimate effort for security fixes."""
        if severity == "critical":
            return "high"
        elif severity == "high":
            return "medium"
        else:
            return "low"

    def _analyze_performance_issues(self, code_analysis: Any, file_content: str) -> List[CodeReviewIssue]:
        """Analyze potential performance issues."""
        issues = []
        lines = file_content.split('\n')
        
        # Check for nested loops (O(n²) complexity)
        nested_loop_count = len(re.findall(r'for\s+.*:\s*\n.*for\s+.*:', file_content, re.MULTILINE))
        if nested_loop_count > 0:
            issues.append(CodeReviewIssue(
                severity="medium",
                category="performance",
                title="Nested loops detected",
                description=f"Found {nested_loop_count} nested loop(s) which may cause O(n²) complexity",
                line_number=0,
                code_snippet="",
                suggestion="Consider optimizing nested loops or using more efficient algorithms",
                impact="Slow performance with large datasets",
                effort="medium"
            ))
        
        # Check for repeated string concatenation in loops
        if re.search(r'for\s+.*:.*\+=.*str', file_content, re.MULTILINE | re.IGNORECASE):
            issues.append(CodeReviewIssue(
                severity="medium", 
                category="performance",
                title="String concatenation in loop",
                description="String concatenation in loops is inefficient",
                line_number=0,
                code_snippet="",
                suggestion="Use join() method or list comprehension for better performance",
                impact="Poor performance with large iterations",
                effort="low"
            ))
        
        return issues

    def _analyze_maintainability_issues(self, code_analysis: Any, file_content: str) -> List[CodeReviewIssue]:
        """Analyze maintainability issues."""
        issues = []
        
        # Check for magic numbers
        magic_numbers = re.findall(r'\b(?<!\.)\d{2,}\b', file_content)
        if len(magic_numbers) > 3:
            issues.append(CodeReviewIssue(
                severity="low",
                category="maintainability", 
                title="Magic numbers detected",
                description=f"Found {len(magic_numbers)} magic numbers that should be constants",
                line_number=0,
                code_snippet="",
                suggestion="Replace magic numbers with named constants",
                impact="Harder to understand and maintain code",
                effort="low"
            ))
        
        # Check for deep nesting
        max_indent = max(len(line) - len(line.lstrip()) for line in file_content.split('\n') if line.strip())
        if max_indent > 16:  # More than 4 levels of indentation
            issues.append(CodeReviewIssue(
                severity="medium",
                category="maintainability",
                title="Deep nesting detected",
                description=f"Maximum indentation level is {max_indent//4} which indicates deep nesting",
                line_number=0,
                code_snippet="",
                suggestion="Reduce nesting by extracting functions or using guard clauses",
                impact="Code is harder to read and understand",
                effort="medium"
            ))
        
        return issues

    def _calculate_overall_score(self, code_analysis: Any, security_analysis: Any, issues: List[CodeReviewIssue]) -> float:
        """Calculate overall code quality score."""
        # Start with code analysis scores
        code_score = code_analysis.metrics.maintainability_score
        security_score = security_analysis.security_score
        
        # Average the base scores
        base_score = (code_score + security_score) / 2
        
        # Apply penalties for critical issues
        critical_penalty = len([i for i in issues if i.severity == "critical"]) * 10
        high_penalty = len([i for i in issues if i.severity == "high"]) * 5
        medium_penalty = len([i for i in issues if i.severity == "medium"]) * 2
        
        final_score = base_score - critical_penalty - high_penalty - medium_penalty
        
        return max(0.0, min(100.0, final_score))

    def _identify_strengths(self, code_analysis: Any, security_analysis: Any, file_content: str) -> List[str]:
        """Identify positive aspects of the code."""
        strengths = []
        
        # Code structure strengths
        if code_analysis.metrics.maintainability_score > 80:
            strengths.append("High maintainability score - well-structured code")
        
        if code_analysis.metrics.complexity < 10:
            strengths.append("Low cyclomatic complexity - easy to understand and test")
        
        if len(code_analysis.structure.functions) > 0:
            strengths.append("Good function decomposition - modular design")
        
        # Security strengths
        if security_analysis.security_score > 90:
            strengths.append("Excellent security score - follows security best practices")
        elif security_analysis.security_score > 70:
            strengths.append("Good security practices implemented")
        
        # Pattern detection strengths
        if "Async/Await Pattern" in code_analysis.patterns:
            strengths.append("Uses modern async/await patterns for better performance")
        
        if "Object-Oriented Programming" in code_analysis.patterns:
            strengths.append("Good use of object-oriented design principles")
        
        # Code quality indicators
        if "try:" in file_content.lower() and "except" in file_content.lower():
            strengths.append("Implements proper error handling with try-catch blocks")
        
        if len(re.findall(r'def\s+test_\w+', file_content)) > 0:
            strengths.append("Includes unit tests - good testing practices")
        
        return strengths

    def _generate_comprehensive_recommendations(
        self, 
        code_analysis: Any,
        security_analysis: Any, 
        issues: List[CodeReviewIssue]
    ) -> List[str]:
        """Generate comprehensive recommendations."""
        recommendations = []
        
        # Priority-based recommendations
        critical_issues = [i for i in issues if i.severity == "critical"]
        if critical_issues:
            recommendations.append(f"🚨 Address {len(critical_issues)} critical issue(s) immediately")
        
        high_issues = [i for i in issues if i.severity == "high"]
        if high_issues:
            recommendations.append(f"⚠️ Fix {len(high_issues)} high-priority issue(s) in next iteration")
        
        # Category-specific recommendations
        categories = set(issue.category for issue in issues)
        
        if "security" in categories:
            recommendations.extend(security_analysis.recommendations[:3])
        
        if "performance" in categories:
            recommendations.append("🚀 Profile code performance and optimize bottlenecks")
        
        if "maintainability" in categories:
            recommendations.append("🔧 Refactor complex functions to improve maintainability")
        
        # General best practices
        if code_analysis.metrics.lines_of_code > 200:
            recommendations.append("📝 Consider splitting large files into smaller modules")
        
        if len(code_analysis.structure.functions) == 0:
            recommendations.append("🎯 Add functions to improve code organization")
        
        recommendations.extend([
            "📋 Add comprehensive unit tests for critical functions",
            "📖 Ensure all public APIs have proper documentation",
            "🔍 Set up automated code quality checks (linting, formatting)"
        ])
        
        return recommendations

    def _issue_to_dict(self, issue: CodeReviewIssue) -> Dict[str, Any]:
        """Convert CodeReviewIssue to dictionary."""
        return {
            "severity": issue.severity,
            "category": issue.category,
            "title": issue.title,
            "description": issue.description,
            "line_number": issue.line_number,
            "code_snippet": issue.code_snippet,
            "suggestion": issue.suggestion,
            "impact": issue.impact,
            "effort": issue.effort
        }


# Global service instance will be created in tool_executor.py