import fs from 'fs/promises';
import path from 'path';

export const INVENTORY_ROOT = '/Users/reedrichardson/Desktop/Master-Agent';

export interface BundleComponent {
  name: string;
  path: string;
  category: string; // 'agents', 'commands', 'skills', 'hooks'
  description?: string;
}

export interface BundleData {
  description?: string;
  components: {
    agents: BundleComponent[];
    commands: BundleComponent[];
    skills: BundleComponent[];
    hooks: BundleComponent[];
  };
  totalCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file' | 'bundle';
  category?: string; // 'AGENT', 'SKILL', 'TOOL', etc.
  description?: string;
  repo?: string; // Source repository name
  children?: InventoryItem[];
  bundleData?: BundleData;
}

interface RepoConfig {
  name: string;
  componentPaths: { type: string; path: string; categoryFromPath?: boolean }[];
}

// MCP configurations for nested structures within 1.MCP-MISC
interface NestedMcpConfig {
  repoName: string;           // e.g., 'google_workspace_mcp-main'
  subPath: string;            // e.g., '' for root or 'packages' for subdir
  category: string;           // Category for grouping
  pattern?: RegExp;           // Optional pattern to filter subdirs
  descriptionFile?: string;   // File to read description from (default: README.md)
}

const NESTED_MCP_CONFIGS: NestedMcpConfig[] = [
  // Google Workspace MCP services (gcalendar, gdocs, gmail, etc.)
  { repoName: 'google_workspace_mcp-main', subPath: '', category: 'google-workspace', pattern: /^g[a-z]+$/ },
  // GCloud MCP packages
  { repoName: 'gcloud-mcp-main', subPath: 'packages', category: 'google-cloud' },
  // MCP Security servers
  { repoName: 'mcp-security-main', subPath: 'server', category: 'security' },
  // n8n integration nodes
  { repoName: 'n8n-master', subPath: 'packages/nodes-base/nodes', category: 'n8n-integrations' },
];

// Configuration for each repo and where to find components
const REPO_CONFIGS: RepoConfig[] = [
  {
    name: 'claude-code-templates-main',
    componentPaths: [
      { type: 'agents', path: 'cli-tool/components/agents' },
      { type: 'commands', path: 'cli-tool/components/commands' },
      { type: 'skills', path: 'cli-tool/components/skills' },
      { type: 'hooks', path: 'cli-tool/components/hooks' },
      { type: 'mcps', path: 'cli-tool/components/mcps' },
      { type: 'settings', path: 'cli-tool/components/settings' },
    ]
  },
  {
    name: 'superpowers-main',
    componentPaths: [
      { type: 'agents', path: 'agents' },
      { type: 'commands', path: 'commands' },
      { type: 'skills', path: 'skills' },
      { type: 'hooks', path: 'hooks' },
    ]
  },
  {
    name: 'skills-main',
    componentPaths: [
      { type: 'skills', path: 'skills' },
    ]
  },
  {
    name: 'claude-code-main',
    componentPaths: [
      // Agents
      { type: 'agents', path: 'plugins/feature-dev/agents', categoryFromPath: true },
      { type: 'agents', path: 'plugins/plugin-dev/agents', categoryFromPath: true },
      { type: 'agents', path: 'plugins/pr-review-toolkit/agents', categoryFromPath: true },
      { type: 'agents', path: 'plugins/agent-sdk-dev/agents', categoryFromPath: true },
      { type: 'agents', path: 'plugins/hookify/agents', categoryFromPath: true },
      { type: 'agents', path: 'plugins/code-review/agents', categoryFromPath: true },
      { type: 'agents', path: 'plugins/frontend-design/agents', categoryFromPath: true },
      // Commands
      { type: 'commands', path: 'plugins/feature-dev/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/plugin-dev/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/pr-review-toolkit/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/agent-sdk-dev/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/hookify/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/code-review/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/ralph-wiggum/commands', categoryFromPath: true },
      { type: 'commands', path: 'plugins/commit-commands/commands', categoryFromPath: true },
      { type: 'commands', path: '.claude/commands' },
      // Skills
      { type: 'skills', path: 'plugins/plugin-dev/skills', categoryFromPath: true },
      { type: 'skills', path: 'plugins/hookify/skills', categoryFromPath: true },
      { type: 'skills', path: 'plugins/claude-opus-4-5-migration/skills', categoryFromPath: true },
      { type: 'skills', path: 'plugins/frontend-design/skills', categoryFromPath: true },
      // Hooks
      { type: 'hooks', path: 'plugins/hookify/hooks', categoryFromPath: true },
      { type: 'hooks', path: 'plugins/ralph-wiggum/hooks', categoryFromPath: true },
      { type: 'hooks', path: 'plugins/learning-output-style/hooks', categoryFromPath: true },
      { type: 'hooks', path: 'plugins/explanatory-output-style/hooks', categoryFromPath: true },
      { type: 'hooks', path: 'plugins/security-guidance/hooks', categoryFromPath: true },
    ]
  },
  {
    name: 'claude-cookbooks-main',
    componentPaths: [
      { type: 'agents', path: 'patterns/agents/prompts' },
      { type: 'agents', path: '.claude/agents' },
      { type: 'commands', path: '.claude/commands' },
      { type: 'skills', path: '.claude/skills' },
    ]
  },
  {
    name: 'everything-claude-code-main',
    componentPaths: [
      { type: 'agents', path: 'agents' },
      { type: 'commands', path: 'commands' },
      { type: 'skills', path: 'skills' },
      { type: 'hooks', path: 'hooks' },
    ]
  },
];

// Map component types to NodeTypes used in the visual builder
const TYPE_TO_NODE_TYPE: Record<string, string> = {
  agents: 'AGENT',
  commands: 'COMMAND',
  skills: 'SKILL',
  settings: 'PROVIDER',
  hooks: 'HOOK',
  mcps: 'TOOL',
};

interface ComponentInfo {
  name: string;
  path: string;
  category: string;
  description?: string;
  repo: string;
}

/**
 * Extract description from README.md (first paragraph after title)
 */
async function parseReadme(readmePath: string): Promise<string | undefined> {
  try {
    const content = await fs.readFile(readmePath, 'utf-8');
    // Skip title and badges, find first paragraph
    const lines = content.split('\n');
    let foundTitle = false;
    let description = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!foundTitle && trimmed.startsWith('#')) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('[') && !trimmed.startsWith('!')) {
        description = trimmed;
        break;
      }
    }

    return description || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Scan a directory where each subdirectory is an MCP server
 */
async function scanMcpDirectory(
  dirPath: string,
  repoName: string
): Promise<ComponentInfo[]> {
  const mcps: ComponentInfo[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // Skip hidden folders

      const mcpPath = path.join(dirPath, entry.name);
      const readmePath = path.join(mcpPath, 'README.md');

      // Try to get description from README
      const description = await parseReadme(readmePath);

      // Clean up name (remove -main, -master suffix)
      let name = entry.name
        .replace(/-main$/, '')
        .replace(/-master$/, '');

      mcps.push({
        name,
        path: mcpPath,
        category: 'mcp-servers',
        description,
        repo: repoName,
      });
    }
  } catch (err) {
    // Directory doesn't exist or can't be read
  }

  return mcps;
}

/**
 * Scan nested MCP structures within repos
 */
async function scanNestedMcps(
  config: NestedMcpConfig,
  basePath: string
): Promise<ComponentInfo[]> {
  const mcps: ComponentInfo[] = [];
  const fullPath = config.subPath
    ? path.join(basePath, config.repoName, config.subPath)
    : path.join(basePath, config.repoName);

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;

      // Apply pattern filter if specified
      if (config.pattern && !config.pattern.test(entry.name)) continue;

      const mcpPath = path.join(fullPath, entry.name);
      const readmePath = path.join(mcpPath, config.descriptionFile || 'README.md');

      const description = await parseReadme(readmePath);

      mcps.push({
        name: entry.name,
        path: mcpPath,
        category: config.category,
        description,
        repo: config.repoName.replace(/-main$/, '').replace(/-master$/, ''),
      });
    }
  } catch (err) {
    // Directory doesn't exist
  }

  return mcps;
}

/**
 * Parse awesome-mcp-servers README to extract MCP server entries
 */
async function parseAwesomeMcpList(readmePath: string): Promise<ComponentInfo[]> {
  const mcps: ComponentInfo[] = [];

  try {
    const content = await fs.readFile(readmePath, 'utf-8');
    // Match lines like: - [name](url) - description
    const pattern = /^\s*-\s*\[([^\]]+)\]\(([^)]+)\)[^-]*-\s*(.+)$/gm;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const [, name, url, description] = match;
      mcps.push({
        name: name.trim(),
        path: url.trim(),
        category: 'curated-list',
        description: description.trim().slice(0, 200),
        repo: 'awesome-mcp-servers',
      });
    }
  } catch (err) {
    // File doesn't exist
  }

  return mcps;
}

/**
 * Extract name and description from markdown frontmatter or first lines
 */
async function parseComponentFile(filePath: string): Promise<{ name?: string; description?: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Try to parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const nameMatch = frontmatter.match(/^name:\s*['"]?(.+?)['"]?\s*$/m);
      const descMatch = frontmatter.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
      return {
        name: nameMatch?.[1]?.trim(),
        description: descMatch?.[1]?.trim(),
      };
    }

    // Fallback: Use first heading as name
    const headingMatch = content.match(/^#\s+(.+)$/m);
    return {
      name: headingMatch?.[1]?.trim(),
      description: undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Scan a directory for component files (.md, .json)
 */
async function scanComponentDir(
  dirPath: string,
  componentType: string,
  repoName: string,
  categoryOverride?: string
): Promise<ComponentInfo[]> {
  const components: ComponentInfo[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectory (category folder)
        const subComponents = await scanComponentDir(
          entryPath,
          componentType,
          repoName,
          categoryOverride || entry.name
        );
        components.push(...subComponents);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
        // Skip README files
        if (entry.name.toLowerCase() === 'readme.md') continue;

        const parsed = await parseComponentFile(entryPath);
        const baseName = path.basename(entry.name, path.extname(entry.name));

        components.push({
          name: parsed.name || baseName,
          path: entryPath,
          category: categoryOverride || 'uncategorized',
          description: parsed.description,
          repo: repoName,
        });
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't be read - silently skip
  }

  return components;
}

/**
 * Scan plugin bundles from claude-code-main/plugins/
 * Each plugin directory can contain agents/, commands/, skills/, hooks/ subdirectories
 */
async function scanPluginBundles(): Promise<InventoryItem[]> {
  const bundles: InventoryItem[] = [];
  const pluginsPath = path.join(INVENTORY_ROOT, 'claude-code-main/plugins');

  try {
    const entries = await fs.readdir(pluginsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;

      const pluginPath = path.join(pluginsPath, entry.name);

      // Read plugin description from README.md or plugin.json
      const readmePath = path.join(pluginPath, 'README.md');
      const pluginJsonPath = path.join(pluginPath, '.claude-plugin/plugin.json');

      let description: string | undefined;

      // Try plugin.json first
      try {
        const pluginJson = JSON.parse(await fs.readFile(pluginJsonPath, 'utf-8'));
        description = pluginJson.description;
      } catch {
        // Fall back to README
        description = await parseReadme(readmePath);
      }

      // Scan for component subdirectories
      const components: BundleData['components'] = {
        agents: [],
        commands: [],
        skills: [],
        hooks: [],
      };

      const componentTypes = ['agents', 'commands', 'skills', 'hooks'] as const;

      for (const compType of componentTypes) {
        const compPath = path.join(pluginPath, compType);

        try {
          const compEntries = await fs.readdir(compPath, { withFileTypes: true });

          for (const compEntry of compEntries) {
            if (!compEntry.isFile()) continue;
            if (!compEntry.name.endsWith('.md') && !compEntry.name.endsWith('.json')) continue;
            if (compEntry.name.toLowerCase() === 'readme.md') continue;

            const filePath = path.join(compPath, compEntry.name);
            const parsed = await parseComponentFile(filePath);
            const baseName = path.basename(compEntry.name, path.extname(compEntry.name));

            components[compType].push({
              name: parsed.name || baseName,
              path: filePath,
              category: compType,
              description: parsed.description,
            });
          }
        } catch {
          // Directory doesn't exist - skip
        }
      }

      // Calculate total count
      const totalCount =
        components.agents.length +
        components.commands.length +
        components.skills.length +
        components.hooks.length;

      // Only include if plugin has at least one component
      if (totalCount > 0) {
        bundles.push({
          id: `bundle/${entry.name}`,
          name: entry.name,
          path: pluginPath,
          type: 'bundle',
          description,
          repo: 'claude-code-main',
          bundleData: {
            description,
            components,
            totalCount,
          },
        });
      }
    }
  } catch (err) {
    // Plugins directory doesn't exist
  }

  // Sort bundles alphabetically
  bundles.sort((a, b) => a.name.localeCompare(b.name));

  return bundles;
}

/**
 * Scan all configured repos and build the full inventory tree
 */
export const scanInventory = async (): Promise<InventoryItem[]> => {
  // Map: type -> repo -> category -> components
  const typeMap = new Map<string, Map<string, Map<string, ComponentInfo[]>>>();

  // Helper to add MCPs to the type map
  const addMcpsToMap = (mcps: ComponentInfo[]) => {
    for (const mcp of mcps) {
      if (!typeMap.has('mcps')) {
        typeMap.set('mcps', new Map());
      }
      const repoMap = typeMap.get('mcps')!;

      if (!repoMap.has(mcp.repo)) {
        repoMap.set(mcp.repo, new Map());
      }
      const categoryMap = repoMap.get(mcp.repo)!;

      if (!categoryMap.has(mcp.category)) {
        categoryMap.set(mcp.category, []);
      }
      categoryMap.get(mcp.category)!.push(mcp);
    }
  };

  // 1. Scan top-level MCP directories (1.MCP-MISC root repos)
  const mcpMiscPath = path.join(INVENTORY_ROOT, '1.MCP-MISC');
  const topLevelMcps = await scanMcpDirectory(mcpMiscPath, '1.MCP-MISC');
  addMcpsToMap(topLevelMcps);

  // 2. Scan nested MCP structures (subfolders within repos)
  for (const config of NESTED_MCP_CONFIGS) {
    const nestedMcps = await scanNestedMcps(config, path.join(INVENTORY_ROOT, '1.MCP-MISC'));
    addMcpsToMap(nestedMcps);
  }

  // 3. Parse awesome-mcp-servers curated list
  const awesomePath = path.join(INVENTORY_ROOT, '1.MCP-MISC/awesome-mcp-servers-main/README.md');
  const awesomeMcps = await parseAwesomeMcpList(awesomePath);
  addMcpsToMap(awesomeMcps);

  // Scan each repo
  for (const repoConfig of REPO_CONFIGS) {
    const repoPath = path.join(INVENTORY_ROOT, repoConfig.name);

    for (const compPath of repoConfig.componentPaths) {
      const fullPath = path.join(repoPath, compPath.path);

      // For paths like plugins/feature-dev/agents, extract plugin name as category
      let categoryFromPath: string | undefined;
      if (compPath.categoryFromPath) {
        const parts = compPath.path.split('/');
        // e.g., "plugins/feature-dev/agents" -> "feature-dev"
        categoryFromPath = parts[parts.length - 2];
      }

      const components = await scanComponentDir(
        fullPath,
        compPath.type,
        repoConfig.name,
        categoryFromPath
      );

      for (const comp of components) {
        // Initialize nested maps if needed
        if (!typeMap.has(compPath.type)) {
          typeMap.set(compPath.type, new Map());
        }
        const repoMap = typeMap.get(compPath.type)!;

        if (!repoMap.has(comp.repo)) {
          repoMap.set(comp.repo, new Map());
        }
        const categoryMap = repoMap.get(comp.repo)!;

        if (!categoryMap.has(comp.category)) {
          categoryMap.set(comp.category, []);
        }
        categoryMap.get(comp.category)!.push(comp);
      }
    }
  }

  // Build the tree: type -> repo -> category -> components
  const tree: InventoryItem[] = [];

  for (const [typeName, repoMap] of typeMap) {
    const nodeType = TYPE_TO_NODE_TYPE[typeName] || 'AGENT';

    const typeFolder: InventoryItem = {
      id: typeName,
      name: typeName,
      path: typeName,
      type: 'folder',
      children: [],
    };

    for (const [repoName, categoryMap] of repoMap) {
      const repoFolder: InventoryItem = {
        id: `${typeName}/${repoName}`,
        name: repoName,
        path: `${typeName}/${repoName}`,
        type: 'folder',
        repo: repoName,
        children: [],
      };

      for (const [categoryName, components] of categoryMap) {
        const categoryFolder: InventoryItem = {
          id: `${typeName}/${repoName}/${categoryName}`,
          name: categoryName,
          path: `${typeName}/${repoName}/${categoryName}`,
          type: 'folder',
          repo: repoName,
          children: components.map(c => ({
            id: c.path,
            name: c.name,
            path: c.path,
            type: 'file' as const,
            category: nodeType,
            description: c.description,
            repo: repoName,
          })),
        };

        // Sort components within category alphabetically
        categoryFolder.children!.sort((a, b) => a.name.localeCompare(b.name));
        repoFolder.children!.push(categoryFolder);
      }

      // Sort categories alphabetically
      repoFolder.children!.sort((a, b) => a.name.localeCompare(b.name));
      typeFolder.children!.push(repoFolder);
    }

    // Sort repos alphabetically
    typeFolder.children!.sort((a, b) => a.name.localeCompare(b.name));
    tree.push(typeFolder);
  }

  // Sort type folders alphabetically
  tree.sort((a, b) => a.name.localeCompare(b.name));

  // Scan plugin bundles and add as a separate category
  const bundles = await scanPluginBundles();

  if (bundles.length > 0) {
    const bundlesFolder: InventoryItem = {
      id: 'bundles',
      name: 'bundles',
      path: 'bundles',
      type: 'folder',
      children: bundles,
    };
    tree.push(bundlesFolder);
  }

  // Re-sort to include bundles
  tree.sort((a, b) => a.name.localeCompare(b.name));

  return tree;
};
