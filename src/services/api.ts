import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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
  category?: string;
  description?: string;
  repo?: string; // Source repository name
  children?: InventoryItem[];
  bundleData?: BundleData;
}

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const response = await axios.get<InventoryItem[]>(`${API_URL}/inventory`);
  return response.data;
};

export const fetchComponentContent = async (filePath: string): Promise<string> => {
  const response = await axios.get<{ content: string }>(
    `${API_URL}/component-content`,
    { params: { path: filePath } }
  );
  return response.data.content;
};