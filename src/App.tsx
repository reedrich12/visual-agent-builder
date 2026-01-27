import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Canvas } from './components/Editor/Canvas';
import { LibraryPanel } from './components/Library/LibraryPanel';
import { PropertiesPanel } from './components/Properties/PropertiesPanel';
import { fetchInventory } from './services/api';
import { Zap } from 'lucide-react';
import useStore from './store/useStore';

const queryClient = new QueryClient();

function AppContent() {
  const { libraryCategory, setLibraryCategory } = useStore();

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  // Extract top-level category names from inventory
  const categories = inventory?.map(item => item.name) || [];

  // Handle category tab click - exit addToAgentMode when clicking tabs directly
  const handleCategoryTabClick = (cat: string) => {
    setLibraryCategory(cat, false);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b flex items-center px-4 justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded text-white">
            <Zap size={18} fill="currentColor" />
          </div>
          <h1 className="font-bold text-slate-800 text-lg tracking-tight">Visual Agent Builder</h1>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryTabClick(cat)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                libraryCategory === cat
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-sm text-slate-500">
          v0.3.0 (Phase 4 Properties)
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Real Library Panel */}
        <LibraryPanel />

        {/* Canvas Area */}
        <main className="flex-1 relative bg-slate-50">
          <Canvas />
        </main>

        {/* Real Properties Panel */}
        <PropertiesPanel />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
