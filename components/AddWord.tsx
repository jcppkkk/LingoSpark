import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { analyzeWord, generateMnemonicImage, extractWordsFromImage } from '../services/geminiService';
import { createNewCard, saveCard, checkWordExists } from '../services/storageService';
import { Flashcard } from '../types';
import FlashcardComponent from './FlashcardComponent';

interface AddWordProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface QueueItem {
  id: string;
  word: string;
  status: 'PENDING' | 'ANALYZING' | 'GENERATING_IMAGE' | 'SUCCESS' | 'ERROR';
  card?: Flashcard;
  errorMsg?: string;
  isDuplicate?: boolean;
}

const AddWord: React.FC<AddWordProps> = ({ onCancel, onSuccess }) => {
  const [input, setInput] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detectedWords, setDetectedWords] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // --- Queue Processing Logic ---
  // We use the queue state itself as the "Lock". 
  // If any item is currently busy (ANALYZING or GENERATING_IMAGE), we do nothing.
  // Otherwise, we pick the next PENDING item.
  
  useEffect(() => {
    const processQueue = async () => {
      // 1. Check if we are already busy
      const isBusy = queue.some(item => 
        item.status === 'ANALYZING' || item.status === 'GENERATING_IMAGE'
      );
      if (isBusy) return;

      // 2. Find next pending item
      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem) return;

      // 3. Start processing logic for this item
      await processItem(nextItem);
    };

    processQueue();
  }, [queue]); // Re-run whenever queue state updates (e.g. when an item finishes)

  const processItem = async (item: QueueItem) => {
    // Helper to update THIS item's status
    const updateStatus = (updates: Partial<QueueItem>) => {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
    };

    try {
        // A. Mark as busy (ANALYZING)
        updateStatus({ status: 'ANALYZING' });
        
        // B. Check Duplicate (Async)
        // We do this first to save AI tokens
        const exists = await checkWordExists(item.word);
        if (exists) {
           updateStatus({ status: 'ERROR', errorMsg: '單字庫中已存在', isDuplicate: true });
           return;
        }

        // C. AI Analysis (Text)
        const analysis = await analyzeWord(item.word);
        let newCard = createNewCard(analysis);

        // D. Mark as Generating Image
        updateStatus({ status: 'GENERATING_IMAGE', card: newCard });
        
        try {
            // Use specific prompt or fallback to word
            const imagePrompt = analysis.imagePrompt || analysis.mnemonicHint || analysis.word;
            const imageUrl = await generateMnemonicImage(analysis.word, imagePrompt);
            newCard.imageUrl = imageUrl;
            newCard.imagePrompt = imagePrompt;
        } catch (imgErr) {
            console.warn("Image gen failed, continuing with text-only card", imgErr);
        }

        // E. Save to DB & Mark Success
        await saveCard(newCard);
        updateStatus({ status: 'SUCCESS', card: newCard });

        // Auto-preview logic: 
        // If user hasn't selected anything, OR if user is looking at this item (which was pending), refresh it.
        setPreviewItem(current => {
            if (!current) return { ...item, status: 'SUCCESS', card: newCard };
            if (current.id === item.id) return { ...item, status: 'SUCCESS', card: newCard };
            return current;
        });

    } catch (err: any) {
        console.error("Processing failed for", item.word, err);
        
        let msg = '分析失敗';
        const eStr = (err.message || err.toString()).toLowerCase();
        
        if (eStr.includes('safety') || eStr.includes('blocked')) {
            msg = '內容涉及敏感話題，無法生成';
        } else if (eStr.includes('503') || eStr.includes('overloaded') || eStr.includes('busy')) {
            msg = 'AI 伺服器繁忙，請稍後重試';
        } else if (eStr.includes('network') || eStr.includes('fetch') || eStr.includes('connection')) {
            msg = '網路連線不穩定';
        } else if (eStr.includes('400') || eStr.includes('invalid')) {
            msg = '無法辨識該單字，請檢查拼字';
        } else if (eStr.includes('json')) {
            msg = 'AI 回傳格式錯誤，請重試';
        }

        updateStatus({ status: 'ERROR', errorMsg: msg });
    }
  };

  const addToQueue = (wordStr: string) => {
    if (!wordStr.trim()) return;
    const word = wordStr.trim();
    
    // Check if already in current queue
    if (queue.some(q => q.word.toLowerCase() === word.toLowerCase())) return;

    const newItem: QueueItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
      word,
      status: 'PENDING'
    };
    setQueue(prev => [...prev, newItem]);
    setInput('');
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToQueue(input);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    setDetectedWords([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const words = await extractWordsFromImage(base64String);
        if (words.length > 0) {
          setDetectedWords(words);
        } else {
          setScanError("照片中找不到明顯的單字");
        }
      } catch (err) {
        console.error(err);
        setScanError("分析照片失敗，請檢查網路");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleDetectedWord = (word: string) => {
    if (queue.some(q => q.word.toLowerCase() === word.toLowerCase())) return;
    addToQueue(word);
  };

  const handleCardUpdate = (updatedCard: Flashcard) => {
     setPreviewItem(prev => prev && prev.card?.id === updatedCard.id ? { ...prev, card: updatedCard } : prev);
  };

  // Remove item or Retry
  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setQueue(prev => prev.filter(q => q.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
  };

  const handleRetryItem = (item: QueueItem, e: React.MouseEvent) => {
      e.stopPropagation();
      // Reset to PENDING
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'PENDING', errorMsg: undefined } : q));
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col p-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onCancel} className="p-3 text-slate-400 hover:bg-white hover:text-primary hover:shadow-md rounded-full transition-all">
          <Icons.Flip size={24} className="rotate-90" />
        </button>
        <h2 className="text-2xl font-black text-slate-700 tracking-tight">製作新卡片</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 lg:items-start h-full overflow-y-auto lg:overflow-hidden">
        
        {/* Left: Input & Queue List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full">
            
            {/* Input Form */}
            <div>
                 <h1 className="text-2xl font-black text-dark mb-2">輸入英文單字</h1>
                 <form onSubmit={handleInputSubmit} className="flex gap-2">
                    <div className="flex-1 flex items-center bg-white border-4 border-slate-100 rounded-2xl focus-within:border-primary px-2 transition-colors">
                        <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="例如: cat"
                        className="flex-1 p-4 text-xl font-bold bg-transparent outline-none"
                        autoFocus
                        />
                         <button
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-none w-12 h-12 bg-slate-50 text-slate-400 rounded-xl hover:bg-sky-100 hover:text-sky-500 transition-all flex items-center justify-center mr-1"
                            title="拍照/上傳圖片"
                        >
                            <Icons.Camera size={24} />
                        </button>
                    </div>
                   
                    <button type="submit" disabled={!input.trim()} className="hidden"></button>
                </form>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            {/* Scanned Words */}
            {detectedWords.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                   <p className="text-xs font-bold text-slate-400 mb-2 uppercase flex items-center justify-between">
                     <span>點擊加入列表</span>
                     <span className="bg-sky-100 text-sky-600 px-2 rounded-full text-[10px]">{detectedWords.length} 個發現</span>
                   </p>
                   <div className="flex flex-wrap gap-2">
                     {detectedWords.map((word, idx) => {
                        const inQueue = queue.some(q => q.word.toLowerCase() === word.toLowerCase());
                        return (
                            <button
                                key={idx}
                                onClick={() => handleToggleDetectedWord(word)}
                                disabled={inQueue}
                                className={`px-3 py-1 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-1
                                   ${inQueue ? 'bg-slate-50 text-slate-300 border-slate-50 cursor-default' : 'bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}
                                `}
                            >
                                {word} {inQueue && <Icons.Check size={12} />}
                            </button>
                        );
                     })}
                   </div>
                </div>
            )}
            {isScanning && (
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center">
                    <Icons.Camera size={32} className="text-primary animate-bounce mb-2" />
                    <span className="text-sm font-bold text-slate-400">正在分析照片...</span>
                </div>
            )}
            {scanError && (
                 <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 text-red-400 text-sm font-bold text-center">
                    {scanError}
                 </div>
            )}

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 rounded-3xl p-2 min-h-[200px]">
                {queue.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold opacity-60">
                        <Icons.Book size={32} className="mb-2"/>
                        <span>等待新增單字...</span>
                    </div>
                )}
                {queue.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => item.card && setPreviewItem(item)}
                        className={`p-3 mb-2 rounded-2xl flex items-center justify-between border-2 transition-all cursor-pointer relative overflow-hidden group
                            ${previewItem?.id === item.id ? 'border-primary bg-white shadow-lg z-10 scale-[1.02]' : 'border-transparent bg-white hover:border-slate-200'}
                        `}
                    >
                        {/* Progress Bar Background for active item */}
                        {(item.status === 'ANALYZING' || item.status === 'GENERATING_IMAGE') && (
                            <div className="absolute left-0 bottom-0 h-1 bg-primary/20 w-full">
                                <div className={`h-full bg-primary transition-all duration-1000 ${item.status === 'GENERATING_IMAGE' ? 'w-full' : 'w-1/3'}`}></div>
                            </div>
                        )}

                        <span className="font-bold text-lg text-dark pl-2">{item.word}</span>
                        
                        <div className="flex items-center gap-2 pr-2 relative z-10">
                            {/* Remove button only shows on hover if not busy */}
                            {item.status === 'PENDING' && (
                                <button 
                                    onClick={(e) => handleRemoveItem(item.id, e)}
                                    className="hidden group-hover:block p-1 text-slate-300 hover:text-red-400"
                                >
                                    <Icons.Plus size={16} className="rotate-45" />
                                </button>
                            )}

                            {item.status === 'PENDING' && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full group-hover:hidden">排隊中</span>}
                            
                            {item.status === 'ANALYZING' && (
                                <div className="flex items-center gap-1 text-primary text-xs font-bold">
                                    <Icons.Learn size={14} className="animate-pulse"/>
                                    <span>分析中...</span>
                                </div>
                            )}
                            
                            {item.status === 'GENERATING_IMAGE' && (
                                <div className="flex items-center gap-1 text-accent text-xs font-bold">
                                    <Icons.Image size={14} className="animate-pulse"/>
                                    <span>繪圖中...</span>
                                </div>
                            )}
                            
                            {item.status === 'SUCCESS' && (
                                <div className="w-6 h-6 bg-secondary text-white rounded-full flex items-center justify-center shadow-sm">
                                    <Icons.Check size={14} strokeWidth={3} />
                                </div>
                            )}
                            
                            {item.status === 'ERROR' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-red-500 font-bold">{item.isDuplicate ? '已重複' : '失敗'}</span>
                                    <button 
                                        onClick={(e) => handleRetryItem(item, e)}
                                        className="p-1 bg-red-50 text-red-400 rounded-full hover:bg-red-100"
                                        title="重試"
                                    >
                                        <Icons.Regenerate size={14} />
                                    </button>
                                     <button 
                                        onClick={(e) => handleRemoveItem(item.id, e)}
                                        className="p-1 text-slate-300 hover:text-red-400"
                                        title="移除"
                                    >
                                        <Icons.Plus size={16} className="rotate-45" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

        </div>

        {/* Right: Preview Area */}
        <div className="w-full lg:w-2/3 h-full flex flex-col bg-white/40 rounded-[3rem] border-4 border-dashed border-slate-200 p-4 lg:p-8 relative">
            
            {previewItem?.status === 'SUCCESS' && previewItem.card ? (
                 <div className="w-full h-full flex flex-col items-center animate-in zoom-in-95 duration-300">
                    <div className="flex-1 w-full flex items-center justify-center overflow-y-auto custom-scrollbar mb-4 pt-4">
                        <FlashcardComponent 
                            card={previewItem.card} 
                            isFlipped={true}
                            onFlip={() => {}} 
                            onUpdateCard={handleCardUpdate}
                            allowEdit={true}
                        />
                    </div>
                    <div className="text-center text-secondary font-bold flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100">
                        <Icons.Check size={16} /> 
                        <span>已自動儲存至單字庫</span>
                    </div>
                 </div>
            ) : previewItem?.status === 'ERROR' ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-400">
                        <Icons.Flash size={32} />
                    </div>
                    <p className="font-bold text-lg text-dark">{previewItem.errorMsg || '發生錯誤'}</p>
                    <button 
                        onClick={(e) => handleRetryItem(previewItem, e)}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/90"
                    >
                        重新嘗試
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 select-none">
                     <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Icons.Image size={64} className="opacity-50" />
                     </div>
                     <p className="font-bold text-xl mb-2">準備製作卡片</p>
                     <p className="text-sm opacity-60">輸入單字或拍照，AI 幫你搞定一切</p>
                </div>
            )}

        </div>

      </div>
    </div>
  );
};

export default AddWord;