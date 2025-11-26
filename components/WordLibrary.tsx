import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { analyzeWord, generateMnemonicImage, extractWordsFromImage } from '../services/geminiService';
import { createNewCard, saveCard, checkWordExists, getCards, deleteCard } from '../services/storageService';
import { Flashcard, CardStatus } from '../types';
import FlashcardComponent from './FlashcardComponent';
import { Trash2, Filter } from 'lucide-react';

interface WordLibraryProps {
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

type TabType = 'library' | 'create';

const STORAGE_KEY_DETECTED_WORDS = 'lingospark_detected_words';
const STORAGE_KEY_QUEUE = 'lingospark_addword_queue';

const WordLibrary: React.FC<WordLibraryProps> = ({ onCancel, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  
  // Library Management State
  const [libraryCards, setLibraryCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'learned'>('all');
  
  // Create Card State (from AddWord)
  const [input, setInput] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const [detectedWords, setDetectedWords] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Load library cards
  useEffect(() => {
    loadLibraryCards();
  }, []);

  // Queue Processing Logic
  useEffect(() => {
    const processQueue = async () => {
      const isBusy = queue.some(item => 
        item.status === 'ANALYZING' || item.status === 'GENERATING_IMAGE'
      );
      if (isBusy) return;

      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem) return;

      await processItem(nextItem);
    };

    processQueue();
  }, [queue]);

  // Restore saved detected words and queue
  useEffect(() => {
    try {
      const savedDetectedWords = localStorage.getItem(STORAGE_KEY_DETECTED_WORDS);
      if (savedDetectedWords) {
        const words = JSON.parse(savedDetectedWords);
        if (Array.isArray(words) && words.length > 0) {
          setDetectedWords(words);
        }
      }

      const savedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (savedQueue) {
        const queueItems: QueueItem[] = JSON.parse(savedQueue);
        const pendingItems = queueItems.filter(item => item.status === 'PENDING');
        if (pendingItems.length > 0) {
          setQueue(pendingItems);
        }
      }
    } catch (err) {
      console.warn('無法從 localStorage 恢復數據:', err);
    }
  }, []);

  // Save detected words
  useEffect(() => {
    if (detectedWords.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_DETECTED_WORDS, JSON.stringify(detectedWords));
      } catch (err) {
        console.warn('無法保存檢測到的單字到 localStorage:', err);
      }
    }
  }, [detectedWords]);

  // Save queue
  useEffect(() => {
    if (queue.length > 0) {
      try {
        const pendingItems = queue.filter(item => item.status === 'PENDING');
        if (pendingItems.length > 0) {
          localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(pendingItems));
        } else {
          localStorage.removeItem(STORAGE_KEY_QUEUE);
        }
      } catch (err) {
        console.warn('無法保存隊列到 localStorage:', err);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_QUEUE);
    }
  }, [queue]);

  // File input handler
  useEffect(() => {
    const button = uploadButtonRef.current;
    const fileInput = fileInputRef.current;
    
    if (!button || !fileInput) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    };

    button.addEventListener('click', handleClick);
    return () => {
      button.removeEventListener('click', handleClick);
    };
  }, []);

  const loadLibraryCards = async () => {
    setIsLoadingLibrary(true);
    try {
      const cards = await getCards();
      setLibraryCards(cards);
    } catch (err) {
      console.error('載入字庫失敗:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('確定要刪除這個單字卡嗎？')) return;
    
    try {
      await deleteCard(cardId);
      setLibraryCards(prev => prev.filter(c => c.id !== cardId));
      if (selectedCard?.id === cardId) {
        setSelectedCard(null);
      }
      onSuccess(); // Refresh stats
    } catch (err) {
      console.error('刪除失敗:', err);
      alert('刪除失敗，請重試');
    }
  };

  const handleCardUpdate = (updatedCard: Flashcard) => {
    setLibraryCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    if (selectedCard?.id === updatedCard.id) {
      setSelectedCard(updatedCard);
    }
    // Also update queue if applicable
    setPreviewItem(prev => prev && prev.card?.id === updatedCard.id ? { ...prev, card: updatedCard } : prev);
    setQueue(prev => prev.map(item => 
      item.card?.id === updatedCard.id ? { ...item, card: updatedCard } : item
    ));
  };

  const processItem = async (item: QueueItem) => {
    const updateStatus = (updates: Partial<QueueItem>) => {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
    };

    try {
        updateStatus({ status: 'ANALYZING' });
        
        const exists = await checkWordExists(item.word);
        if (exists) {
           updateStatus({ status: 'ERROR', errorMsg: '單字庫中已存在', isDuplicate: true });
           return;
        }

        const analysis = await analyzeWord(item.word);
        let newCard = createNewCard(analysis, undefined, CardStatus.GENERATING);

        updateStatus({ status: 'GENERATING_IMAGE', card: newCard });
        
        try {
            const imagePrompt = analysis.imagePrompt || analysis.mnemonicHint || analysis.word;
            const imageUrl = await generateMnemonicImage(analysis.word, imagePrompt);
            newCard.imageUrl = imageUrl;
            newCard.imagePrompt = imagePrompt;
        } catch (imgErr) {
            console.warn("Image gen failed, continuing with text-only card", imgErr);
        }

        await saveCard(newCard);
        const finalCard = { ...newCard, status: CardStatus.NORMAL };
        updateStatus({ status: 'SUCCESS', card: finalCard });

        setPreviewItem(current => {
            if (!current) return { ...item, status: 'SUCCESS', card: finalCard };
            if (current.id === item.id) return { ...item, status: 'SUCCESS', card: finalCard };
            return current;
        });

        // Refresh library when new card is created
        await loadLibraryCards();
        onSuccess();

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

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const words = await extractWordsFromImage(base64String);
        if (words.length > 0) {
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

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setQueue(prev => prev.filter(q => q.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
  };

  const handleRetryItem = (item: QueueItem, e: React.MouseEvent) => {
      e.stopPropagation();
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'PENDING', errorMsg: undefined } : q));
  };

  // Filter and search library cards
  const filteredCards = libraryCards.filter(card => {
    const matchesSearch = card.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        card.data.definition.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'due') {
      return card.nextReviewDate <= Date.now();
    } else if (filterStatus === 'learned') {
      return card.repetition > 3;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col p-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onCancel} 
          className="p-3 text-slate-400 hover:bg-white hover:text-primary hover:shadow-md rounded-full transition-all"
        >
          <Icons.Flip size={24} className="rotate-90" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary to-purple-500 text-white rounded-2xl shadow-lg transform -rotate-2 border-2 border-white/50">
            <Icons.Book size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-dark tracking-tight">字庫管理</h2>
            <div className="h-1 bg-gradient-to-r from-primary/30 via-primary to-purple-500/30 rounded-full mt-1"></div>
          </div>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-50 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            activeTab === 'library'
              ? 'bg-white text-primary shadow-md'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Book size={18} />
            <span>我的字庫 ({libraryCards.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-white text-primary shadow-md'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Add size={18} />
            <span>製作新卡片</span>
            {queue.length > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                {queue.filter(q => q.status === 'PENDING' || q.status === 'ANALYZING' || q.status === 'GENERATING_IMAGE').length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' ? (
          /* Library Management View */
          <div className="h-full flex gap-6">
            {/* Left: Card List */}
            <div className="w-1/3 flex flex-col gap-4 h-full">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋單字或定義..."
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-primary outline-none font-medium"
                  />
                </div>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'due' | 'learned')}
                    className="appearance-none bg-white border-2 border-slate-100 rounded-xl px-4 py-3 pr-8 font-bold text-slate-600 focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="all">全部</option>
                    <option value="due">待複習</option>
                    <option value="learned">已學會</option>
                  </select>
                  <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Card List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border-2 border-slate-100 p-2">
                {isLoadingLibrary ? (
                  <div className="h-full flex items-center justify-center text-slate-300">
                    <Icons.Learn size={32} className="animate-pulse" />
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <Icons.Book size={48} className="mb-3 opacity-50" />
                    <p className="font-bold">沒有找到單字</p>
                    <p className="text-sm mt-1">試試調整搜尋條件</p>
                  </div>
                ) : (
                  filteredCards.map(card => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className={`p-4 mb-2 rounded-xl border-2 transition-all cursor-pointer group ${
                        selectedCard?.id === card.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-dark">{card.word}</h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{card.data.definition}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              /{card.data.ipa}/
                            </span>
                            {card.nextReviewDate <= Date.now() && (
                              <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                待複習
                              </span>
                            )}
                            {card.repetition > 3 && (
                              <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                                已學會
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Card Preview */}
            <div className="flex-1 h-full flex items-center justify-center bg-white/40 rounded-[3rem] border-4 border-dashed border-slate-200 p-6">
              {selectedCard ? (
                <div className="w-full h-full flex items-center justify-center">
                  <FlashcardComponent 
                    card={selectedCard} 
                    isFlipped={true}
                    onFlip={() => {}} 
                    onUpdateCard={handleCardUpdate}
                    allowEdit={true}
                    isPreview={true}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <Icons.Book size={64} className="mb-4 opacity-50" />
                  <p className="font-bold text-xl mb-2">選擇單字卡查看</p>
                  <p className="text-sm opacity-60">從左側列表選擇一個單字</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Create Card View */
          <div className="h-full flex flex-col lg:flex-row gap-8 lg:items-start overflow-y-auto lg:overflow-hidden">
            
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
                            {(item.status === 'ANALYZING' || item.status === 'GENERATING_IMAGE') && (
                                <div className="absolute left-0 bottom-0 h-1 bg-primary/20 w-full">
                                    <div className={`h-full bg-primary transition-all duration-1000 ${item.status === 'GENERATING_IMAGE' ? 'w-full' : 'w-1/3'}`}></div>
                                </div>
                            )}

                            <span className="font-bold text-lg text-dark pl-2">{item.word}</span>
                            
                            <div className="flex items-center gap-2 pr-2 relative z-10">
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
        )}
      </div>
    </div>
  );
};

export default WordLibrary;

