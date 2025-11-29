import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icons } from '../constants';
import { analyzeWord, extractWordsFromImage, generateMnemonicImage } from '../services/geminiService';
import { createNewCard, saveCard, checkWordExists, getCards, deleteCard } from '../services/storageService';
import { findDefaultEnglishVoice } from '../services/speechService';
import { Flashcard, CardStatus } from '../types';
import FlashcardComponent from './FlashcardComponent';
import ImageRegenerateModal from './ImageRegenerateModal';
import { Trash2, Filter } from 'lucide-react';

interface WordLibraryProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface QueueItem {
  id: string;
  word: string;
  status: 'PENDING' | 'ANALYZING' | 'SUCCESS' | 'ERROR';
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
  const [sortBy, setSortBy] = useState<'a-z' | 'date' | 'proficiency'>('a-z');
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  // Create Card State
  const [input, setInput] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const [detectedWords, setDetectedWords] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Image Regenerate State
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedImages, setRegeneratedImages] = useState<string[]>([]);
  const [regeneratingCard, setRegeneratingCard] = useState<Flashcard | null>(null);

  // @ARCH:START WordLibrary - FEAT: 載入單字庫
  // Load library cards
  const loadLibraryCards = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const cards = await getCards();
      setLibraryCards(cards);
    } catch (err) {
      console.error('載入字庫失敗:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    loadLibraryCards();
    // 載入預設語音
    findDefaultEnglishVoice().then(v => setVoice(v)).catch(console.error);
  }, [loadLibraryCards]);
  // @ARCH:END WordLibrary - FEAT: 載入單字庫

  // @ARCH:START WordLibrary - FEAT: AI 分析單字
  const processItem = useCallback(async (item: QueueItem) => {
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
        
        // 生成圖片
        let imageUrl: string | undefined;
        try {
          if (analysis.imagePrompt) {
            imageUrl = await generateMnemonicImage(analysis.word, analysis.imagePrompt);
          }
        } catch (imgErr) {
          console.warn("圖片生成失敗，繼續使用文字卡片", imgErr);
        }
        
        let newCard = createNewCard(analysis, imageUrl, CardStatus.GENERATING);

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
        // 新增完成後切換到字庫管理標籤頁，不跳回主畫面
        setActiveTab('library');

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
  }, [loadLibraryCards, setQueue, setPreviewItem, setActiveTab]);
  // @ARCH:END WordLibrary - FEAT: AI 分析單字

  // @ARCH:START WordLibrary - FEAT: 處理佇列邏輯
  // Queue Processing Logic
  useEffect(() => {
    const processQueue = async () => {
      const isBusy = queue.some(item => 
        item.status === 'ANALYZING'
      );
      if (isBusy) return;

      const nextItem = queue.find(item => item.status === 'PENDING');
      if (!nextItem) return;

      await processItem(nextItem);
    };

    processQueue();
  }, [queue, processItem]);
  // @ARCH:END WordLibrary - FEAT: 處理佇列邏輯

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

  // @ARCH:START WordLibrary - UX: 新增單字到佇列流程
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
  // @ARCH:END WordLibrary - UX: 新增單字到佇列流程

  // @ARCH:START WordLibrary - FEAT: 圖片識別
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
  // @ARCH:END WordLibrary - FEAT: 圖片識別


// ========================================
// 其他程式碼（未標記）
// ========================================



// ========================================
// 其他程式碼（未標記）
// ========================================


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

  // @ARCH:START WordLibrary - FEAT: 重新生成圖片
  const handleRegenerateImage = async (card: Flashcard) => {
    if (!card.imagePrompt) {
      alert('此單字沒有圖片生成提示，無法重新生成圖片');
      return;
    }

    setIsRegenerating(true);
    setRegeneratingCard(card);
    setRegeneratedImages([]);
    setIsRegenerateModalOpen(true);

    try {
      // 生成兩張新圖片
      const [image1, image2] = await Promise.all([
        generateMnemonicImage(card.word, card.imagePrompt).catch(err => {
          console.error('生成第一張圖片失敗:', err);
          return null;
        }),
        generateMnemonicImage(card.word, card.imagePrompt).catch(err => {
          console.error('生成第二張圖片失敗:', err);
          return null;
        })
      ]);

      const newImages = [image1, image2].filter((img): img is string => img !== null);
      
      if (newImages.length === 0) {
        // 如果兩張圖片都生成失敗
        alert('圖片生成失敗，請檢查網路連線後重試');
        setIsRegenerateModalOpen(false);
        setRegeneratingCard(null);
        return;
      }
      
      setRegeneratedImages(newImages);
    } catch (error) {
      console.error('重新生成圖片失敗:', error);
      alert('重新生成圖片失敗，請重試');
      setIsRegenerateModalOpen(false);
      setRegeneratingCard(null);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleImageSelect = async (selectedImageUrl: string | null) => {
    if (!regeneratingCard) return;

    try {
      const updatedCard: Flashcard = {
        ...regeneratingCard,
        imageUrl: selectedImageUrl || undefined,
        status: CardStatus.UPDATING
      };

      await saveCard(updatedCard, false); // 不立即清除狀態
      handleCardUpdate(updatedCard);

      // 延遲清除狀態，讓使用者看到更新效果
      setTimeout(() => {
        const finalCard: Flashcard = { ...updatedCard, status: CardStatus.NORMAL };
        saveCard(finalCard, true).then(() => handleCardUpdate(finalCard));
      }, 1000);
    } catch (error) {
      console.error('更新圖片失敗:', error);
      alert('更新圖片失敗，請重試');
    } finally {
      setIsRegenerateModalOpen(false);
      setRegeneratingCard(null);
      setRegeneratedImages([]);
    }
  };

  // 當模態框關閉時重置選擇狀態
  const handleModalClose = () => {
    setIsRegenerateModalOpen(false);
    setRegeneratingCard(null);
    setRegeneratedImages([]);
    setIsRegenerating(false);
  };
  // @ARCH:END WordLibrary - FEAT: 重新生成圖片

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToQueue(input);
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

  // Sort filtered cards
  const sortedCards = [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case 'a-z':
        return a.word.toLowerCase().localeCompare(b.word.toLowerCase(), 'en');
      
      case 'date':
        // 最新的在前
        return b.createdAt - a.createdAt;
      
      case 'proficiency': {
        // 熟練度計算：repetition * efactor，高的在前
        // 如果 repetition 相同，則比較 efactor
        const proficiencyA = a.repetition * a.efactor;
        const proficiencyB = b.repetition * b.efactor;
        if (proficiencyA !== proficiencyB) {
          return proficiencyB - proficiencyA;
        }
        // 如果熟練度相同，則按 repetition 排序
        if (a.repetition !== b.repetition) {
          return b.repetition - a.repetition;
        }
        // 如果 repetition 也相同，則按 efactor 排序
        return b.efactor - a.efactor;
      }
      
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col p-6 animate-in fade-in duration-300">
      
      {/* @ARCH:START WordLibrary - UI: 頁面標頭 */}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onCancel} 
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-xl font-bold transition-all active:scale-95"
        >
          <Icons.ArrowLeft size={20} />
          <span>返回</span>
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
      {/* @ARCH:END WordLibrary - UI: 頁面標頭 */}

      {/* @ARCH:START WordLibrary - UI: 標籤切換 */}
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
                {queue.filter(q => q.status === 'PENDING' || q.status === 'ANALYZING').length}
              </span>
            )}
          </div>
        </button>
      </div>
      {/* @ARCH:END WordLibrary - UI: 標籤切換 */}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' ? (
          /* Library Management View */
          <div className="h-full flex gap-6">
            {/* Left: Card List */}
            <div className="w-1/3 flex flex-col gap-4 h-full">
              {/* @ARCH:START WordLibrary - UI: 搜尋與過濾工具 */}
              {/* Search, Filter and Sort */}
              <div className="flex flex-col gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋單字或定義..."
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-primary outline-none font-medium"
                  />
                </div>
                {/* Filter and Sort */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'due' | 'learned')}
                      className="appearance-none bg-white border-2 border-slate-100 rounded-xl px-4 py-3 pr-8 font-bold text-slate-600 focus:border-primary outline-none cursor-pointer w-full"
                    >
                      <option value="all">全部</option>
                      <option value="due">待複習</option>
                      <option value="learned">已學會</option>
                    </select>
                    <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'a-z' | 'date' | 'proficiency')}
                      className="appearance-none bg-white border-2 border-slate-100 rounded-xl px-4 py-3 pr-8 font-bold text-slate-600 focus:border-primary outline-none cursor-pointer w-full"
                    >
                      <option value="a-z">A-Z</option>
                      <option value="date">新增日期</option>
                      <option value="proficiency">熟練度</option>
                    </select>
                    <Icons.Time size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              {/* @ARCH:END WordLibrary - UI: 搜尋與過濾工具 */}

              {/* @ARCH:START WordLibrary - UI: 單字卡列表 */}
              {/* Card List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border-2 border-slate-100 p-2">
                {isLoadingLibrary ? (
                  <div className="h-full flex items-center justify-center text-slate-300">
                    <Icons.Learn size={32} className="animate-pulse" />
                  </div>
                ) : sortedCards.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <Icons.Book size={48} className="mb-3 opacity-50" />
                    <p className="font-bold">沒有找到單字</p>
                    <p className="text-sm mt-1">試試調整搜尋條件</p>
                  </div>
                ) : (
                  sortedCards.map(card => (
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
                          <h3 className="font-black text-lg text-dark flex items-center gap-1.5">
                            {card.word}
                            {card.data.syllables && card.data.syllables.length >= 2 && card.data.stressIndex !== undefined && (
                              <span className="text-xs font-bold" title={`重音節: ${card.data.syllables[card.data.stressIndex]}`}>
                                <div className="flex items-center gap-1">
                                  {card.data.syllables.map((syl, idx) => {
                                    const isStressed = idx === card.data.stressIndex;
                                    return (
                                      <span 
                                        key={idx} 
                                        className={`relative inline-block text-dark border-b-2 ${isStressed ? 'border-teal-500 border-b-4' : 'border-blue-700'}`}
                                      >
                                        {/* 重音符號標記 */}
                                        {isStressed && (
                                          <span 
                                            className="absolute -top-2 left-1/2 -translate-x-1/2 text-teal-500 font-bold"
                                            style={{ fontSize: '0.6em' }}
                                          >
                                            ′
                                          </span>
                                        )}
                                        {syl}
                                      </span>
                                    );
                                  })}
                                </div>
                              </span>
                            )}
                          </h3>
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
              {/* @ARCH:END WordLibrary - UI: 單字卡列表 */}
            </div>

            {/* @ARCH:START WordLibrary - UI: 單字卡預覽區 */}
            {/* Right: Card Preview */}
            <div className="flex-1 h-full flex flex-col bg-white/40 rounded-[3rem] border-4 border-dashed border-slate-200 p-6 overflow-hidden">
              {selectedCard ? (
                <>
                  {/* 重新生成圖片按鈕 */}
                  {selectedCard.imagePrompt && (
                    <div className="mb-4 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateImage(selectedCard);
                        }}
                        disabled={isRegenerating}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="重新生成圖片"
                      >
                        {isRegenerating ? (
                          <>
                            <Icons.Regenerate size={18} className="animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Icons.Regenerate size={18} />
                            重新生成圖片
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* 單字卡預覽 */}
                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                    <FlashcardComponent 
                      card={selectedCard} 
                      onUpdateCard={handleCardUpdate}
                      allowEdit={true}
                      isPreview={true}
                      voice={voice}
                      autoPlay={false}
                      showSpeechButton={true}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 h-full">
                  <Icons.Book size={64} className="mb-4 opacity-50" />
                  <p className="font-bold text-xl mb-2">選擇單字卡查看</p>
                  <p className="text-sm opacity-60">從左側列表選擇一個單字</p>
                </div>
              )}
            </div>
            {/* @ARCH:END WordLibrary - UI: 單字卡預覽區 */}
          </div>
        ) : (
          /* @ARCH:START WordLibrary - UI: 製作新卡片視圖 */
          /* Create Card View */
          <div className="h-full flex flex-col lg:flex-row gap-8 lg:items-start overflow-y-auto lg:overflow-hidden">
            
            {/* Left: Input & Queue List */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full">
                
                {/* @ARCH:START WordLibrary - UI: 單字輸入表單 */}
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
                {/* @ARCH:END WordLibrary - UI: 單字輸入表單 */}

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
                                    <div className={`h-full bg-primary transition-all duration-1000 w-1/3`}></div>
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
                                
                                {item.status === 'ANALYZING' && (
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
            <div className="w-full lg:w-2/3 h-full flex flex-col items-center justify-center bg-white/40 rounded-[3rem] border-4 border-dashed border-slate-200 p-4 lg:p-6 relative overflow-hidden">
                
                {previewItem?.status === 'SUCCESS' && previewItem.card ? (
                     <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center min-h-0 overflow-hidden">
                            <FlashcardComponent 
                                card={previewItem.card} 
                                onUpdateCard={handleCardUpdate}
                                allowEdit={true}
                                isPreview={true}
                                voice={voice}
                                autoPlay={false}
                                showSpeechButton={true}
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

      {/* 圖片重新生成模態框 */}
      <ImageRegenerateModal
        isOpen={isRegenerateModalOpen}
        originalImage={regeneratingCard?.imageUrl}
        newImages={regeneratedImages}
        onSelect={handleImageSelect}
        onClose={handleModalClose}
        isLoading={isRegenerating}
      />
    </div>
  );
};

export default WordLibrary;

