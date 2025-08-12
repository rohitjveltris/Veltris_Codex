"""Code diff generation service."""
import difflib
from typing import List

from src.models.tools import CodeDiffParams, CodeDiffResult, DiffLine, DiffSummary


class CodeDiffService:
    """Service for generating code diffs."""

    async def generate_diff(self, params: CodeDiffParams) -> CodeDiffResult:
        """Generate code diff between old and new code."""
        old_lines = params.old_code.splitlines(keepends=True)
        new_lines = params.new_code.splitlines(keepends=True)
        
        # Generate unified diff
        diff = difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile="old_code",
            tofile="new_code",
            lineterm=""
        )
        
        # Parse diff and create structured result
        diffs: List[DiffLine] = []
        lines_added = 0
        lines_removed = 0
        current_line_number = 1
        
        # Use ndiff for better line-by-line comparison
        ndiff = difflib.ndiff(old_lines, new_lines)
        
        for line in ndiff:
            if line.startswith("  "):  # Unchanged line
                diffs.append(DiffLine(
                    type="unchanged",
                    content=line[2:].rstrip("\n"),
                    line_number=current_line_number
                ))
                current_line_number += 1
            elif line.startswith("- "):  # Removed line
                diffs.append(DiffLine(
                    type="removed",
                    content=line[2:].rstrip("\n"),
                    line_number=current_line_number
                ))
                lines_removed += 1
            elif line.startswith("+ "):  # Added line
                diffs.append(DiffLine(
                    type="added",
                    content=line[2:].rstrip("\n"),
                    line_number=current_line_number
                ))
                lines_added += 1
                current_line_number += 1
            elif line.startswith("? "):  # Diff hint - skip
                continue
        
        # Calculate changed lines (minimum of added and removed)
        lines_changed = min(lines_added, lines_removed)
        
        summary = DiffSummary(
            lines_added=lines_added,
            lines_removed=lines_removed,
            lines_changed=lines_changed
        )
        
        return CodeDiffResult(diffs=diffs, summary=summary)


# Global service instance
code_diff_service = CodeDiffService()