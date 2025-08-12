
from fastapi import APIRouter, HTTPException
from src.services.tool_executor import get_tool_executor

import traceback
from typing import Dict

router = APIRouter()

@router.get("/files/tree")
async def get_file_tree(path: str = '.'):
    try:
        tool_executor = get_tool_executor()
        result = await tool_executor.execute_tool("list_directory", {"path": path})
        return result
    except Exception as e:
        traceback.print_exc() # Print the full traceback
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/content")
async def get_file_content(path: str, workingDirectory: str = None):
    try:
        tool_executor = get_tool_executor()
        result = await tool_executor.execute_tool("read_file", {"absolute_path": path, "base_path": workingDirectory})
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/files/write")
async def write_file_route(request: Dict[str, str]):
    file_path = request.get("file_path")
    content = request.get("content")
    working_directory = request.get("workingDirectory")
    if not file_path or content is None:
        raise HTTPException(status_code=400, detail="file_path and content are required")
    try:
        tool_executor = get_tool_executor()
        result = await tool_executor.execute_tool("write_file", {"file_path": file_path, "content": content, "base_path": working_directory})
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
