import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { scanInventory, INVENTORY_ROOT } from '../services/inventory';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Visual Agent Builder API');
});

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await scanInventory();
    // Wrap in an object if the frontend expects a specific structure,
    // or return the array directly.
    // The previous frontend expected { category: items[] }.
    // We will return { root: items[] } or just the array and update frontend.
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.get('/api/component-content', async (req, res) => {
  const filePath = req.query.path as string;

  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter is required' });
  }

  // Security: Ensure the requested path is within the inventory root
  const normalizedPath = path.resolve(filePath);
  if (!normalizedPath.startsWith(INVENTORY_ROOT)) {
    return res.status(403).json({ error: 'Access denied: path outside inventory root' });
  }

  try {
    const content = await fs.readFile(normalizedPath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
