import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { analyzeWord, generateMnemonicImage, extractWordsFromImage } from '../services/geminiService';
import { createNewCard, saveCard, checkWordExists } from '../services/storageService';
import { Flashcard, CardStatus } from '../types';
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

const STORAGE_KEY_DETECTED_WORDS = 'lingospark_detected_words';
const STORAGE_KEY_QUEUE = 'lingospark_addword_queue';

const AddWord: React.FC<AddWordProps> = ({ onCancel, onSuccess }) => {
  const [input, setInput] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
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

  // 恢復保存的檢測單字和隊列
  useEffect(() => {
    try {
      // 恢復檢測到的單字
      const savedDetectedWords = localStorage.getItem(STORAGE_KEY_DETECTED_WORDS);
      if (savedDetectedWords) {
        const words = JSON.parse(savedDetectedWords);
        if (Array.isArray(words) && words.length > 0) {
          setDetectedWords(words);
        }
      }

      // 恢復隊列（只恢復 PENDING 狀態的項目）
      const savedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (savedQueue) {
        const queueItems: QueueItem[] = JSON.parse(savedQueue);
        // 只恢復 PENDING 狀態的項目，其他狀態需要重新處理
        const pendingItems = queueItems.filter(item => item.status === 'PENDING');
        if (pendingItems.length > 0) {
          setQueue(pendingItems);
        }
      }
    } catch (err) {
      console.warn('無法從 localStorage 恢復數據:', err);
    }
  }, []);

  // 保存檢測到的單字到 localStorage
  useEffect(() => {
    if (detectedWords.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_DETECTED_WORDS, JSON.stringify(detectedWords));
      } catch (err) {
        console.warn('無法保存檢測到的單字到 localStorage:', err);
      }
    }
  }, [detectedWords]);

  // 保存隊列到 localStorage
  useEffect(() => {
    if (queue.length > 0) {
      try {
        // 只保存 PENDING 狀態的項目
        const pendingItems = queue.filter(item => item.status === 'PENDING');
        if (pendingItems.length > 0) {
          localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(pendingItems));
        } else {
          // 如果沒有 PENDING 項目，清除保存的隊列
          localStorage.removeItem(STORAGE_KEY_QUEUE);
        }
      } catch (err) {
        console.warn('無法保存隊列到 localStorage:', err);
      }
    } else {
      // 隊列為空時清除保存
      localStorage.removeItem(STORAGE_KEY_QUEUE);
    }
  }, [queue]);

  // 使用原生事件處理器確保檔案選擇對話框能正常打開
  useEffect(() => {
    const button = uploadButtonRef.current;
    const fileInput = fileInputRef.current;
    
    if (!button || !fileInput) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 在用戶交互事件中同步觸發，確保瀏覽器允許打開檔案選擇對話框
      fileInput.click();
    };

    button.addEventListener('click', handleClick);
    return () => {
      button.removeEventListener('click', handleClick);
    };
  }, []);

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
        // Create card with GENERATING status
        let newCard = createNewCard(analysis, undefined, CardStatus.GENERATING);

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

        // E. Save to DB (this will clear the GENERATING status) & Mark Success
        await saveCard(newCard);
        // Update card to have NORMAL status after save
        const finalCard = { ...newCard, status: CardStatus.NORMAL };
        updateStatus({ status: 'SUCCESS', card: finalCard });

        // Auto-preview logic: 
        // If user hasn't selected anything, OR if user is looking at this item (which was pending), refresh it.
        setPreviewItem(current => {
            if (!current) return { ...item, status: 'SUCCESS', card: finalCard };
            if (current.id === item.id) return { ...item, status: 'SUCCESS', card: finalCard };
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
    // 不清空已檢測的單字，而是追加新的結果
    // setDetectedWords([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const words = await extractWordsFromImage(base64String);
        if (words.length > 0) {
          // 合併新檢測的單字，避免重複
          setDetectedWords(prev => {
            const combined = [...prev];
            words.forEach(word => {
              if (!combined.includes(word)) {
                combined.push(word);
              }
            });
            return combined;
          });
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

  const handleClearDetectedWords = () => {
    setDetectedWords([]);
    localStorage.removeItem(STORAGE_KEY_DETECTED_WORDS);
  };

  const handleToggleDetectedWord = (word: string) => {
    if (queue.some(q => q.word.toLowerCase() === word.toLowerCase())) return;
    addToQueue(word);
  };

  const handleAddAllDetectedWords = () => {
    const wordsToAdd = detectedWords.filter(word => 
      !queue.some(q => q.word.toLowerCase() === word.toLowerCase())
    );
    wordsToAdd.forEach(word => addToQueue(word));
  };

  const handleCardUpdate = (updatedCard: Flashcard) => {
     // 更新 previewItem
     setPreviewItem(prev => prev && prev.card?.id === updatedCard.id ? { ...prev, card: updatedCard } : prev);
     // 同時更新 queue 中對應的項目
     setQueue(prev => prev.map(item => 
       item.card?.id === updatedCard.id ? { ...item, card: updatedCard } : item
     ));
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary to-purple-500 text-white rounded-2xl shadow-lg transform -rotate-2 border-2 border-white/50">
            <Icons.Add size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-dark tracking-tight">製作新卡片</h2>
            <div className="h-1 bg-gradient-to-r from-primary/30 via-primary to-purple-500/30 rounded-full mt-1"></div>
          </div>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 lg:items-start h-full overflow-y-auto lg:overflow-hidden">
        
        {/* Left: Input & Queue List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full">
            
            {/* Input Form */}
            <div>
                 <div className="flex items-center gap-2.5 mb-3">
                   <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                     <Icons.Learn size={18} />
                   </div>
                   <div className="flex-1">
                     <h1 className="text-xl font-black text-dark">輸入英文單字</h1>
                     <div className="h-0.5 bg-gradient-to-r from-sky-400/40 to-transparent rounded-full mt-0.5"></div>
                   </div>
                 </div>
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
                            ref={uploadButtonRef}
                            type="button" 
                            className="flex-none w-12 h-12 bg-slate-50 text-slate-400 rounded-xl hover:bg-sky-100 hover:text-sky-500 transition-all flex items-center justify-center mr-1 cursor-pointer"
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
                <div className="bg-white p-4 rounded-2xl border-2 border-sky-100 max-h-60 overflow-y-auto custom-scrollbar shadow-sm">
                   <div className="flex items-center justify-between mb-2">
                     <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                       <Icons.Camera size={12} />
                       <span>點擊加入列表</span>
                     </p>
                     <div className="flex items-center gap-2">
                       <span className="bg-sky-100 text-sky-600 px-2 rounded-full text-[10px] font-bold">{detectedWords.length} 個發現</span>
                       <button
                         onClick={handleClearDetectedWords}
                         className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                         title="清除所有檢測到的單字"
                       >
                         <Icons.Plus size={14} className="rotate-45" />
                       </button>
                     </div>
                   </div>
                   <div className="flex flex-wrap gap-2 mb-2">
                     {detectedWords.map((word, idx) => {
                        const inQueue = queue.some(q => q.word.toLowerCase() === word.toLowerCase());
                        return (
                            <button
                                key={idx}
                                onClick={() => handleToggleDetectedWord(word)}
                                disabled={inQueue}
                                className={`px-3 py-1 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-1
                                   ${inQueue ? 'bg-green-50 text-green-600 border-green-200 cursor-default' : 'bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:shadow-sm'}
                                `}
                            >
                                {word} {inQueue && <Icons.Check size={12} className="text-green-600" />}
                            </button>
                        );
                     })}
                   </div>
                   {(() => {
                     const unaddedCount = detectedWords.filter(word => 
                       !queue.some(q => q.word.toLowerCase() === word.toLowerCase())
                     ).length;
                     return unaddedCount > 0 ? (
                       <button
                         onClick={handleAddAllDetectedWords}
                         className="w-full py-2 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold border border-sky-200 hover:bg-sky-100 transition-colors flex items-center justify-center gap-1"
                       >
                         <Icons.Add size={12} />
                         <span>一鍵加入全部 ({unaddedCount} 個)</span>
                       </button>
                     ) : (
                       <div className="w-full py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-200 flex items-center justify-center gap-1">
                         <Icons.Check size={12} />
                         <span>所有單字已加入隊列</span>
                       </div>
                     );
                   })()}
                   <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                     <Icons.Check size={10} />
                     <span>已自動保存，頁面刷新後仍會保留</span>
                   </p>
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
        <div className="w-full lg:w-2/3 h-full flex flex-col items-center justify-center bg-white/40 rounded-[3rem] border-4 border-dashed border-slate-200 p-4 lg:p-6 relative">
            
            {previewItem?.status === 'SUCCESS' && previewItem.card ? (
                 <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-300 relative">
                    <div className="w-full h-full flex items-center justify-center min-h-0">
                        <FlashcardComponent 
                            card={previewItem.card} 
                            isFlipped={true}
                            onFlip={() => {}} 
                            onUpdateCard={handleCardUpdate}
                            allowEdit={true}
                            isPreview={true}
                        />
                    </div>
                    <div className="absolute top-4 right-4 text-secondary font-bold flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 shadow-sm z-10">
                        <Icons.Check size={14} /> 
                        <span className="text-xs">已自動儲存至單字庫</span>
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