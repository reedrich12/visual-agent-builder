import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import {
  scanInventory,
  INVENTORY_ROOT,
  buildSearchIndex,
  searchInventory,
  FlattenedItem,
} from '../services/inventory';

const app = express();
const PORT = 3001;

// Cache for search index
let searchIndex: FlattenedItem[] | null = null;
let searchIndexPromise: Promise<FlattenedItem[]> | null = null;

async function getSearchIndex(): Promise<FlattenedItem[]> {
  if (searchIndex) return searchIndex;

  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = (async () => {
    const inventory = await scanInventory();
    searchIndex = buildSearchIndex(inventory);
    return searchIndex;
  })();

  return searchIndexPromise;
}

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

app.get('/api/inventory/search', async (req, res) => {
  try {
    const { q, types, repos, categories, buckets, subcategories, limit, offset } = req.query;

    // Parse comma-separated filter values
    const parseList = (val: unknown): string[] | undefined => {
      if (!val || typeof val !== 'string') return undefined;
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    };

    const index = await getSearchIndex();

    const result = searchInventory(
      index,
      typeof q === 'string' ? q : undefined,
      {
        types: parseList(types),
        repos: parseList(repos),
        categories: parseList(categories),
        buckets: parseList(buckets),
        subcategories: parseList(subcategories),
      },
      {
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error searching inventory:', error);
    res.status(500).json({ error: 'Failed to search inventory' });
  }
});

// Bucket counts endpoint for landing view
app.get('/api/inventory/bucket-counts', async (req, res) => {
  try {
    const index = await getSearchIndex();

    // Count items per bucket
    const counts: Record<string, number> = {};
    for (const item of index) {
      for (const bucket of item.buckets) {
        counts[bucket] = (counts[bucket] || 0) + 1;
      }
    }

    res.json({ counts });
  } catch (error) {
    console.error('Error fetching bucket counts:', error);
    res.status(500).json({ error: 'Failed to fetch bucket counts' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
