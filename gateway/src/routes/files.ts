
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.js';
import { getProjectStructure, getFileContent, writeFile } from '@/services/files.js';

const router = Router();

router.get('/tree', asyncHandler(async (req, res) => {
  const { workingDirectory } = req.query;
  const structure = await getProjectStructure(workingDirectory as string | undefined);
  res.json(structure);
}));

router.get('/content', asyncHandler(async (req, res) => {
  const { path, workingDirectory } = req.query;
  if (typeof path !== 'string') {
    return res.status(400).send('Invalid path');
  }
  const content = await getFileContent(path, workingDirectory as string | undefined);
  res.send(content);
}));

router.post('/write', asyncHandler(async (req, res) => {
  const { filePath, content, workingDirectory } = req.body;
  if (typeof filePath !== 'string' || typeof content !== 'string') {
    return res.status(400).send('Invalid filePath or content');
  }
  const result = await writeFile(filePath, content, workingDirectory);
  res.json(result);
}));

export default router;
