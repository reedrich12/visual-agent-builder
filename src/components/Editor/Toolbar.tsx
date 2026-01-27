import { useState, useRef, useEffect } from 'react';
import { Play, Trash2, FileJson, FileText, FolderArchive, ChevronDown, Download } from 'lucide-react';
import useStore from '../../store/useStore';
import { generateClaudeConfig, generateWorkflowJson, downloadFile } from '../../utils/export';
import { generateDirectoryExport } from '../../utils/exportDirectory';
import { downloadAsZip, generateDirectoryTree } from '../../utils/zipGenerator';

export const Toolbar = () => {
  const { nodes, edges, setNodes, setEdges } = useStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      setNodes([]);
      setEdges([]);
    }
  };

  const handleExportJson = () => {
    const json = generateWorkflowJson(nodes, edges);
    downloadFile(JSON.stringify(json, null, 2), 'workflow.json', 'application/json');
    setShowExportMenu(false);
  };

  const handleExportMd = () => {
    const md = generateClaudeConfig(nodes, edges);
    downloadFile(md, 'CLAUDE.md', 'text/markdown');
    setShowExportMenu(false);
  };

  const handleExportZip = async () => {
    const files = generateDirectoryExport(nodes, edges, 'AI-OS Workflow');
    await downloadAsZip(files, 'ai-os-export.zip');
    setShowExportMenu(false);
  };

  const handlePreviewStructure = () => {
    setShowPreview(true);
    setShowExportMenu(false);
  };

  const handleRun = () => {
    alert('Execution simulation started! (Check console for graph structure)');
    console.log('Executing Workflow:', generateWorkflowJson(nodes, edges));
  };

  // Generate preview content
  const previewContent = showPreview ? generateDirectoryTree(generateDirectoryExport(nodes, edges)) : '';

  return (
    <>
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-md border border-slate-200 p-1.5 flex items-center gap-1 z-50">
        <button
          onClick={handleRun}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
        >
          <Play size={14} />
          Run
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Export Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <Download size={14} />
            Export
            <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[180px] z-50">
              <button
                onClick={handleExportJson}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileJson size={14} className="text-blue-500" />
                Export JSON
              </button>
              <button
                onClick={handleExportMd}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileText size={14} className="text-green-500" />
                Export CLAUDE.md
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleExportZip}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FolderArchive size={14} className="text-purple-500" />
                Export Directory (ZIP)
              </button>
              <button
                onClick={handlePreviewStructure}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span className="w-3.5 h-3.5 text-center text-xs">📁</span>
                Preview Structure
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Clear Canvas"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Directory Structure Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowPreview(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Export Directory Structure</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-auto">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre">{previewContent}</pre>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleExportZip();
                }}
                className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <FolderArchive size={14} />
                Download ZIP
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
