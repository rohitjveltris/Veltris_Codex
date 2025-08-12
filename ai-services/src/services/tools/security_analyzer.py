"""Security vulnerability analyzer for code review."""
import re
import ast
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from src.models.tools import CodeAnalysisParams


@dataclass
class SecurityIssue:
    """Represents a security issue found in code."""
    severity: str  # "critical", "high", "medium", "low"
    category: str  # "injection", "authentication", "encryption", etc.
    description: str
    line_number: int
    code_snippet: str
    recommendation: str
    cwe_id: Optional[str] = None  # Common Weakness Enumeration ID


@dataclass
class SecurityAnalysisResult:
    """Result of security analysis."""
    issues: List[SecurityIssue]
    security_score: float  # 0-100, higher is more secure
    summary: Dict[str, int]  # Count by severity
    recommendations: List[str]


class SecurityAnalyzer:
    """Comprehensive security analyzer for various programming languages."""

    def __init__(self):
        # Common insecure patterns
        self.sql_injection_patterns = [
            r'SELECT\s+.*\s+WHERE\s+.*\s*[\+\%]\s*[\'\"]\s*\+',  # SQL string concatenation
            r'INSERT\s+INTO\s+.*VALUES\s*\([^)]*[\+\%][^)]*\)',   # INSERT concatenation
            r'UPDATE\s+.*SET\s+.*=.*[\+\%]',                       # UPDATE concatenation
            r'DELETE\s+FROM\s+.*WHERE\s+.*[\+\%]',                 # DELETE concatenation
            r'cursor\.execute\([^)]*\%[^)]*\)',                    # Python cursor with %
            r'db\.query\([^)]*\+[^)]*\)',                          # Generic query concatenation
        ]
        
        self.xss_patterns = [
            r'innerHTML\s*=\s*[^;]*\+',                            # innerHTML concatenation
            r'document\.write\([^)]*\+[^)]*\)',                    # document.write concatenation
            r'eval\([^)]*\+[^)]*\)',                               # eval with concatenation
            r'setTimeout\([^)]*\+[^)]*\)',                         # setTimeout concatenation
            r'setInterval\([^)]*\+[^)]*\)',                        # setInterval concatenation
        ]
        
        self.command_injection_patterns = [
            r'os\.system\([^)]*\+[^)]*\)',                         # Python os.system
            r'subprocess\.call\([^)]*\+[^)]*\)',                   # Python subprocess
            r'exec\([^)]*\+[^)]*\)',                               # exec with concatenation
            r'shell_exec\([^)]*\.\s*[^)]*\)',                      # PHP shell_exec
            r'system\([^)]*\+[^)]*\)',                             # system calls
        ]
        
        self.crypto_patterns = [
            r'MD5\(',                                              # Weak MD5 hashing
            r'SHA1\(',                                             # Weak SHA1 hashing  
            r'DES\(',                                              # Weak DES encryption
            r'RC4\(',                                              # Weak RC4 encryption
            r'password\s*=\s*[\'\"]\w+[\'\"]\s*',                  # Hardcoded passwords
            r'api_key\s*=\s*[\'\"]\w+[\'\"]\s*',                   # Hardcoded API keys
            r'secret\s*=\s*[\'\"]\w+[\'\"]\s*',                    # Hardcoded secrets
        ]

    async def analyze_security(self, params: CodeAnalysisParams) -> SecurityAnalysisResult:
        """Perform comprehensive security analysis of code."""
        code = params.code_content
        file_path = params.file_path
        
        issues = []
        
        # Determine language and run appropriate analysis
        language = self._detect_language(file_path)
        
        if language == "python":
            issues.extend(await self._analyze_python_security(code))
        elif language in ["javascript", "typescript"]:
            issues.extend(await self._analyze_javascript_security(code))
        elif language == "java":
            issues.extend(await self._analyze_java_security(code))
        
        # Run general security checks
        issues.extend(self._analyze_general_security(code))
        
        # Calculate security score
        security_score = self._calculate_security_score(issues, code)
        
        # Generate summary
        summary = self._generate_summary(issues)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(issues, language)
        
        return SecurityAnalysisResult(
            issues=issues,
            security_score=security_score,
            summary=summary,
            recommendations=recommendations
        )

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
            "php": "php",
            "rb": "ruby",
            "go": "go",
            "rs": "rust"
        }
        return language_map.get(extension, "generic")

    async def _analyze_python_security(self, code: str) -> List[SecurityIssue]:
        """Analyze Python-specific security issues."""
        issues = []
        lines = code.split('\n')
        
        try:
            tree = ast.parse(code)
            
            # Check for dangerous functions
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        func_name = node.func.id
                        
                        # Check for eval/exec usage
                        if func_name in ['eval', 'exec']:
                            issues.append(SecurityIssue(
                                severity="critical",
                                category="code_injection", 
                                description=f"Use of {func_name}() can lead to code injection",
                                line_number=node.lineno,
                                code_snippet=lines[node.lineno - 1] if node.lineno <= len(lines) else "",
                                recommendation=f"Avoid using {func_name}(). Use safer alternatives like ast.literal_eval() for parsing.",
                                cwe_id="CWE-94"
                            ))
                        
                        # Check for pickle usage
                        elif func_name == 'loads' and self._has_pickle_import(tree):
                            issues.append(SecurityIssue(
                                severity="high",
                                category="deserialization",
                                description="Pickle deserialization can execute arbitrary code",
                                line_number=node.lineno,
                                code_snippet=lines[node.lineno - 1] if node.lineno <= len(lines) else "",
                                recommendation="Use json.loads() or safer serialization formats instead of pickle.",
                                cwe_id="CWE-502"
                            ))
                    
                    elif isinstance(node.func, ast.Attribute):
                        # Check for subprocess with shell=True
                        if (isinstance(node.func.value, ast.Name) and 
                            node.func.value.id == 'subprocess' and
                            node.func.attr in ['call', 'run', 'Popen']):
                            
                            for keyword in node.keywords:
                                if (keyword.arg == 'shell' and 
                                    isinstance(keyword.value, ast.Constant) and 
                                    keyword.value.value is True):
                                    issues.append(SecurityIssue(
                                        severity="high",
                                        category="command_injection",
                                        description="subprocess with shell=True is vulnerable to command injection",
                                        line_number=node.lineno,
                                        code_snippet=lines[node.lineno - 1] if node.lineno <= len(lines) else "",
                                        recommendation="Use shell=False and pass commands as a list instead of a string.",
                                        cwe_id="CWE-78"
                                    ))
            
            # Check for hardcoded secrets
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            var_name = target.id.lower()
                            if any(secret in var_name for secret in ['password', 'secret', 'key', 'token']):
                                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                                    if len(node.value.value) > 8:  # Likely not a placeholder
                                        issues.append(SecurityIssue(
                                            severity="high",
                                            category="hardcoded_secrets",
                                            description=f"Hardcoded secret in variable '{target.id}'",
                                            line_number=node.lineno,
                                            code_snippet="[REDACTED - Contains sensitive data]",
                                            recommendation="Use environment variables or secure configuration files.",
                                            cwe_id="CWE-798"
                                        ))
        
        except SyntaxError:
            pass  # Skip AST analysis if code has syntax errors
        
        return issues

    async def _analyze_javascript_security(self, code: str) -> List[SecurityIssue]:
        """Analyze JavaScript/TypeScript-specific security issues."""
        issues = []
        lines = code.split('\n')
        
        # Check for XSS vulnerabilities
        for pattern in self.xss_patterns:
            for match in re.finditer(pattern, code, re.IGNORECASE):
                line_num = code[:match.start()].count('\n') + 1
                issues.append(SecurityIssue(
                    severity="high",
                    category="xss",
                    description="Potential Cross-Site Scripting (XSS) vulnerability",
                    line_number=line_num,
                    code_snippet=lines[line_num - 1] if line_num <= len(lines) else "",
                    recommendation="Use textContent instead of innerHTML, or sanitize user input.",
                    cwe_id="CWE-79"
                ))
        
        # Check for localStorage sensitive data
        if re.search(r'localStorage\.setItem\([^)]*(?:password|token|key)[^)]*\)', code, re.IGNORECASE):
            line_num = code[:re.search(r'localStorage\.setItem\([^)]*(?:password|token|key)[^)]*\)', code, re.IGNORECASE).start()].count('\n') + 1
            issues.append(SecurityIssue(
                severity="medium",
                category="data_exposure",
                description="Sensitive data stored in localStorage",
                line_number=line_num,
                code_snippet=lines[line_num - 1] if line_num <= len(lines) else "",
                recommendation="Use secure storage mechanisms or encrypt sensitive data.",
                cwe_id="CWE-922"
            ))
        
        # Check for console.log with sensitive data
        for match in re.finditer(r'console\.log\([^)]*(?:password|token|key|secret)[^)]*\)', code, re.IGNORECASE):
            line_num = code[:match.start()].count('\n') + 1
            issues.append(SecurityIssue(
                severity="medium",
                category="information_disclosure",
                description="Sensitive information logged to console",
                line_number=line_num,
                code_snippet=lines[line_num - 1] if line_num <= len(lines) else "",
                recommendation="Remove console.log statements containing sensitive data.",
                cwe_id="CWE-532"
            ))
        
        return issues

    async def _analyze_java_security(self, code: str) -> List[SecurityIssue]:
        """Analyze Java-specific security issues."""
        issues = []
        lines = code.split('\n')
        
        # Check for SQL injection in Java
        sql_patterns = [
            r'Statement\s+\w+\s*=.*\.createStatement\(\)',
            r'PreparedStatement\s+\w+\s*=.*\.prepareStatement\([^)]*\+[^)]*\)',
        ]
        
        for pattern in sql_patterns:
            for match in re.finditer(pattern, code, re.IGNORECASE):
                line_num = code[:match.start()].count('\n') + 1
                issues.append(SecurityIssue(
                    severity="high",
                    category="sql_injection",
                    description="Potential SQL injection vulnerability",
                    line_number=line_num,
                    code_snippet=lines[line_num - 1] if line_num <= len(lines) else "",
                    recommendation="Use parameterized queries with PreparedStatement.",
                    cwe_id="CWE-89"
                ))
        
        return issues

    def _analyze_general_security(self, code: str) -> List[SecurityIssue]:
        """Analyze general security issues across all languages."""
        issues = []
        lines = code.split('\n')
        
        # Check for SQL injection patterns
        for pattern in self.sql_injection_patterns:
            for match in re.finditer(pattern, code, re.IGNORECASE):
                line_num = code[:match.start()].count('\n') + 1
                issues.append(SecurityIssue(
                    severity="critical",
                    category="sql_injection",
                    description="Potential SQL injection vulnerability detected",
                    line_number=line_num,
                    code_snippet=lines[line_num - 1] if line_num <= len(lines) else "",
                    recommendation="Use parameterized queries or prepared statements.",
                    cwe_id="CWE-89"
                ))
        
        # Check for command injection patterns  
        for pattern in self.command_injection_patterns:
            for match in re.finditer(pattern, code, re.IGNORECASE):
                line_num = code[:match.start()].count('\n') + 1
                issues.append(SecurityIssue(
                    severity="critical",
                    category="command_injection",
                    description="Potential command injection vulnerability detected",
                    line_number=line_num,
                    code_snippet=lines[line_num - 1] if line_num <= len(lines) else "",
                    recommendation="Validate and sanitize all user inputs. Use safe command execution methods.",
                    cwe_id="CWE-78"
                ))
        
        # Check for weak cryptography
        for pattern in self.crypto_patterns:
            for match in re.finditer(pattern, code, re.IGNORECASE):
                line_num = code[:match.start()].count('\n') + 1
                severity = "critical" if "password" in match.group().lower() or "key" in match.group().lower() else "medium"
                issues.append(SecurityIssue(
                    severity=severity,
                    category="weak_cryptography",
                    description="Weak cryptography or hardcoded secrets detected",
                    line_number=line_num,
                    code_snippet="[REDACTED - May contain sensitive data]" if "password" in match.group().lower() else lines[line_num - 1] if line_num <= len(lines) else "",
                    recommendation="Use strong hashing algorithms (bcrypt, scrypt, Argon2) and environment variables for secrets.",
                    cwe_id="CWE-327"
                ))
        
        # Check for TODO/FIXME security notes
        for i, line in enumerate(lines, 1):
            if re.search(r'#\s*(?:TODO|FIXME).*(?:security|auth|password|token)', line, re.IGNORECASE):
                issues.append(SecurityIssue(
                    severity="low",
                    category="security_todo",
                    description="Security-related TODO/FIXME comment found",
                    line_number=i,
                    code_snippet=line.strip(),
                    recommendation="Address security-related TODO/FIXME items promptly.",
                    cwe_id=None
                ))
        
        return issues

    def _has_pickle_import(self, tree: ast.AST) -> bool:
        """Check if code imports pickle module."""
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name == 'pickle':
                        return True
            elif isinstance(node, ast.ImportFrom):
                if node.module == 'pickle':
                    return True
        return False

    def _calculate_security_score(self, issues: List[SecurityIssue], code: str) -> float:
        """Calculate overall security score (0-100)."""
        base_score = 100.0
        
        # Deduct points based on severity
        severity_penalties = {
            "critical": 25,
            "high": 15,  
            "medium": 8,
            "low": 3
        }
        
        for issue in issues:
            penalty = severity_penalties.get(issue.severity, 5)
            base_score -= penalty
        
        # Bonus for security best practices
        lines = code.split('\n')
        total_lines = len([line for line in lines if line.strip()])
        
        if total_lines > 0:
            # Bonus for try/catch blocks (error handling)
            try_blocks = len(re.findall(r'\btry\s*:', code, re.IGNORECASE))
            if try_blocks > 0:
                base_score += min(try_blocks * 2, 10)
            
            # Bonus for input validation patterns
            validation_patterns = [r'validate\(', r'sanitize\(', r'escape\(', r'isinstance\(']
            for pattern in validation_patterns:
                if re.search(pattern, code, re.IGNORECASE):
                    base_score += 2
        
        return max(0.0, min(100.0, base_score))

    def _generate_summary(self, issues: List[SecurityIssue]) -> Dict[str, int]:
        """Generate summary of issues by severity."""
        summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        for issue in issues:
            summary[issue.severity] += 1
            
        return summary

    def _generate_recommendations(self, issues: List[SecurityIssue], language: str) -> List[str]:
        """Generate general security recommendations."""
        recommendations = []
        
        categories = set(issue.category for issue in issues)
        
        if "sql_injection" in categories:
            recommendations.append("Use parameterized queries and prepared statements for all database operations")
        
        if "command_injection" in categories:
            recommendations.append("Validate all user inputs and use safe command execution methods")
        
        if "xss" in categories:
            recommendations.append("Sanitize user inputs and use textContent instead of innerHTML")
        
        if "hardcoded_secrets" in categories:
            recommendations.append("Move all secrets to environment variables or secure configuration files")
        
        if "weak_cryptography" in categories:
            recommendations.append("Use strong cryptographic algorithms (AES-256, bcrypt, scrypt)")
        
        # Language-specific recommendations
        if language == "python":
            recommendations.extend([
                "Use virtual environments to manage dependencies",
                "Enable Python's warnings for security issues",
                "Consider using bandit for automated security testing"
            ])
        elif language in ["javascript", "typescript"]:
            recommendations.extend([
                "Use Content Security Policy (CSP) headers",
                "Implement proper authentication and session management",
                "Use npm audit to check for vulnerable dependencies"
            ])
        
        # General recommendations
        recommendations.extend([
            "Implement proper error handling without information leakage",
            "Use HTTPS for all network communications",
            "Implement proper logging and monitoring",
            "Regular security code reviews and dependency updates"
        ])
        
        return list(set(recommendations))  # Remove duplicates


# Global service instance
security_analyzer = SecurityAnalyzer()