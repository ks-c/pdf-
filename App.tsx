
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Paper, AISettings } from './types';
import { SettingsModal } from './components/SettingsModal';
import { parsePdfToText, parseXlsx } from './services/fileParser';
import { extractInfoFromText, translatePaper, summarizePapers } from './services/aiService';
import { SettingsIcon, TrashIcon, UploadIcon, SparklesIcon, CloseIcon } from './components/Icons';

// Helper component for individual paper items, defined in the same file to reduce file count
const PaperItem: React.FC<{
  paper: Paper;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNoteChange: (id: string, text: string) => void;
}> = ({ paper, isSelected, onToggleSelect, onDelete, onNoteChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(paper.id);
            }}
            className="mt-1.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">{paper.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{paper.authors.join(', ')}</p>
            <p className="text-xs text-slate-500 mt-1">{paper.journal} ({paper.date})</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(paper.id); }}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Delete paper"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-slate-200 dark:border-slate-700 animate-fade-in-up">
          <div className="mt-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">摘要</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{paper.abstract}</p>
          </div>
          {paper.translatedTitle && (
            <div className="mt-4">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">翻译标题</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{paper.translatedTitle}</p>
            </div>
          )}
          {paper.translatedAbstract && (
            <div className="mt-4">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">翻译摘要</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{paper.translatedAbstract}</p>
            </div>
          )}
          <div className="mt-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">笔记</h4>
            <textarea
              value={paper.notes}
              onChange={(e) => onNoteChange(paper.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={3}
              className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="添加笔记..."
            />
          </div>
        </div>
      )}
    </div>
  );
};


export default function App() {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [aiSettings, setAiSettings] = useState<AISettings>({ url: '', key: '', model: '' });
    const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [filter, setFilter] = useState('');
    const [reviewResult, setReviewResult] = useState<string | null>(null);

    useEffect(() => {
        const savedSettings = localStorage.getItem('aiSettings');
        if (savedSettings) {
            setAiSettings(JSON.parse(savedSettings));
        }
        const savedPapers = localStorage.getItem('papers');
        if (savedPapers) {
            setPapers(JSON.parse(savedPapers));
        }
    }, []);

    const saveSettings = (settings: AISettings) => {
        setAiSettings(settings);
        localStorage.setItem('aiSettings', JSON.stringify(settings));
    };
    
    const savePapers = (newPapers: Paper[]) => {
        setPapers(newPapers);
        localStorage.setItem('papers', JSON.stringify(newPapers));
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        setError(null);
        const newPapers: Paper[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setIsLoading(`处理文件 ${i + 1}/${files.length}: ${file.name}`);
            try {
                if (file.type === 'application/pdf') {
                    const text = await parsePdfToText(file);
                    const info = await extractInfoFromText(text, aiSettings);
                    newPapers.push({
                        id: `${Date.now()}-${i}`,
                        title: info.title || '未知标题',
                        authors: info.authors || [],
                        abstract: info.abstract || '无摘要',
                        doi: info.doi || '',
                        journal: info.journal || '',
                        date: info.date || '',
                        notes: '',
                    });
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const parsedData = await parseXlsx(file);
                    parsedData.forEach((item, j) => {
                        newPapers.push({
                            id: `${Date.now()}-${i}-${j}`,
                            title: item.title || '未知标题',
                            authors: item.authors || [],
                            abstract: item.abstract || '无摘要',
                            doi: item.doi || '',
                            journal: item.journal || '',
                            date: item.date || '',
                            notes: '',
                        });
                    });
                }
            } catch (err: any) {
                setError(`处理文件 ${file.name} 失败: ${err.message}`);
                console.error(err);
            }
        }

        savePapers([...papers, ...newPapers]);
        setIsLoading(null);
        event.target.value = ''; // Reset file input
    };

    const handleTranslate = async () => {
        const selectedPapers = papers.filter(p => selectedPaperIds.has(p.id));
        if (selectedPapers.length === 0) {
            setError('请先选择要翻译的文献');
            return;
        }
        setError(null);
        setIsLoading(`翻译中 (0/${selectedPapers.length})...`);
        
        const updatedPapers = [...papers];
        for (let i = 0; i < selectedPapers.length; i++) {
            const paper = selectedPapers[i];
            setIsLoading(`翻译中 (${i + 1}/${selectedPapers.length}): ${paper.title}`);
            try {
                const translation = await translatePaper(paper, aiSettings);
                const paperIndex = updatedPapers.findIndex(p => p.id === paper.id);
                if (paperIndex !== -1) {
                    updatedPapers[paperIndex] = {
                        ...updatedPapers[paperIndex],
                        ...translation,
                    };
                }
            } catch (err: any) {
                setError(`翻译失败: ${err.message}`);
                setIsLoading(null);
                return;
            }
        }
        
        savePapers(updatedPapers);
        setIsLoading(null);
    };
    
    const handleReview = async () => {
        const selectedPapers = papers.filter(p => selectedPaperIds.has(p.id));
        if (selectedPapers.length === 0) {
            setError('请先选择要进行综述的文献');
            return;
        }
        setError(null);
        setIsLoading('正在生成AI综述...');
        try {
            const result = await summarizePapers(selectedPapers, aiSettings);
            setReviewResult(result);
        } catch (err: any) {
            setError(`生成综述失败: ${err.message}`);
        }
        setIsLoading(null);
    };

    const toggleSelect = (id: string) => {
        const newSelection = new Set(selectedPaperIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedPaperIds(newSelection);
    };

    const handleDelete = (id: string) => {
        savePapers(papers.filter(p => p.id !== id));
        const newSelection = new Set(selectedPaperIds);
        newSelection.delete(id);
        setSelectedPaperIds(newSelection);
    };
    
    const handleNoteChange = (id: string, text: string) => {
        const newPapers = papers.map(p => p.id === id ? { ...p, notes: text } : p);
        savePapers(newPapers);
    };
    
    const toggleSelectAll = () => {
        if (selectedPaperIds.size === filteredPapers.length) {
            setSelectedPaperIds(new Set());
        } else {
            setSelectedPaperIds(new Set(filteredPapers.map(p => p.id)));
        }
    };
    
    const filteredPapers = useMemo(() => {
        return papers.filter(p =>
            p.title.toLowerCase().includes(filter.toLowerCase()) ||
            p.authors.some(a => a.toLowerCase().includes(filter.toLowerCase())) ||
            p.journal.toLowerCase().includes(filter.toLowerCase())
        );
    }, [papers, filter]);

    return (
        <>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
                <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm sticky top-0 z-40">
                    <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI 文献助手</h1>
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Settings"
                        >
                            <SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </button>
                    </div>
                </header>

                <main className="container mx-auto p-4 md:p-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
                        <div className="grid md:grid-cols-2 gap-6 items-center">
                            <div>
                                <h2 className="text-xl font-semibold mb-2">1. 上传文件</h2>
                                <p className="text-sm text-slate-500 mb-4">支持 PDF（自动提取信息）和 Excel（需包含标题、作者等列）。</p>
                                <label className="w-full md:w-auto cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-transform transform hover:scale-105">
                                    <UploadIcon className="w-5 h-5 mr-2" />
                                    选择文件
                                    <input type="file" multiple onChange={handleFileUpload} accept=".pdf,.xlsx,.xls" className="hidden" />
                                </label>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold mb-2">2. 执行操作</h2>
                                <p className="text-sm text-slate-500 mb-4">选中下方列表中的文献后，可进行翻译或生成综述。</p>
                                <div className="flex flex-wrap gap-3">
                                    <button onClick={handleTranslate} className="flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-green-300 disabled:cursor-not-allowed" disabled={selectedPaperIds.size === 0}>
                                        <SparklesIcon className="w-5 h-5 mr-2" />
                                        翻译选中
                                    </button>
                                    <button onClick={handleReview} className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-md shadow-md hover:bg-purple-700 transition-transform transform hover:scale-105 disabled:bg-purple-300 disabled:cursor-not-allowed" disabled={selectedPaperIds.size === 0}>
                                        <SparklesIcon className="w-5 h-5 mr-2" />
                                        AI综述选中
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-xl font-semibold">文献库 ({filteredPapers.length}/{papers.length})</h2>
                            <input
                                type="text"
                                placeholder="筛选..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full sm:w-64 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center mb-4 px-1">
                            <input
                                type="checkbox"
                                id="selectAll"
                                checked={filteredPapers.length > 0 && selectedPaperIds.size === filteredPapers.length}
                                onChange={toggleSelectAll}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="selectAll" className="ml-3 text-sm font-medium">
                                全选 ({selectedPaperIds.size} / {filteredPapers.length})
                            </label>
                        </div>
                        <div className="space-y-4">
                            {filteredPapers.length > 0 ? (
                                filteredPapers.map(paper => (
                                    <PaperItem 
                                        key={paper.id}
                                        paper={paper}
                                        isSelected={selectedPaperIds.has(paper.id)}
                                        onToggleSelect={toggleSelect}
                                        onDelete={handleDelete}
                                        onNoteChange={handleNoteChange}
                                    />
                                ))
                            ) : (
                                <p className="text-center text-slate-500 py-8">文献库为空，请上传文件。</p>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            
            <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} onSave={saveSettings} initialSettings={aiSettings} />

            {(isLoading || error) && (
                <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 max-w-sm w-full z-50 border-l-4" style={{borderColor: error ? '#ef4444' : '#3b82f6'}}>
                    <div className="flex items-center">
                        {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>}
                        <p className={`ml-3 font-medium ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {error || isLoading}
                        </p>
                        {error && <button onClick={()=> setError(null)} className="ml-auto"><CloseIcon className="w-5 h-5" /></button>}
                    </div>
                </div>
            )}
            
            {reviewResult && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-3xl relative animate-fade-in-up max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI 综述结果</h2>
                            <button onClick={() => setReviewResult(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="overflow-y-auto pr-2">
                           <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: reviewResult.replace(/\n/g, '<br />') }} />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </>
    );
}
