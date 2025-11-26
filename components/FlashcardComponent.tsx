import React, { useState, useEffect, useRef } from 'react';
import { Flashcard, MnemonicOption, CardStatus } from '../types';
import { Icons } from '../constants';
import { generateMnemonicOptions, generateAlternativeStyleOptions } from '../services/geminiService';
import { saveCard } from '../services/storageService';

interface FlashcardComponentProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
  onUpdateCard?: (updatedCard: Flashcard) => void;
  allowEdit?: boolean;
  isPreview?: boolean;
}

const FlashcardComponent: React.FC<FlashcardComponentProps> = ({ 
  card, 
  isFlipped, 
  onFlip, 
  onUpdateCard,
  allowEdit = true,
  isPreview = false
}) => {
  const { word, definition, ipa, syllables, stressIndex, roots, sentence, sentenceTranslation, mnemonicHint } = card.data;
  
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegeneratingStyle, setIsRegeneratingStyle] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [mnemonicOptions, setMnemonicOptions] = useState<MnemonicOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMnemonicButton, setShowMnemonicButton] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  
  // Track ongoing requests per card to restore state when switching back
  const ongoingRequestsRef = useRef<Map<string, {
    requestId: string;
    promise: Promise<MnemonicOption[]>;
  }>>(new Map());

  // Restore or reset state when card changes
  useEffect(() => {
    const cardRequest = ongoingRequestsRef.current.get(card.id);
    
    if (cardRequest) {
      // This card has an ongoing request, restore loading state
      setIsRegenerating(true);
      setShowOptions(false);
      setMnemonicOptions([]);
      setErrorMessage(null);
      
      // Wait for the request to complete
      cardRequest.promise
        .then((options) => {
          // Check if this is still the current card and request
          const currentRequest = ongoingRequestsRef.current.get(card.id);
          if (currentRequest && currentRequest.requestId === cardRequest.requestId) {
            if (options && options.length > 0) {
              setMnemonicOptions(options);
              setShowOptions(true);
            } else {
              setErrorMessage("未能產生新的記憶卡選項，請稍後再試");
            }
            setIsRegenerating(false);
            // Remove completed request
            ongoingRequestsRef.current.delete(card.id);
          }
        })
        .catch((err) => {
          // Check if this is still the current card and request
          const currentRequest = ongoingRequestsRef.current.get(card.id);
          if (currentRequest && currentRequest.requestId === cardRequest.requestId) {
            console.error("Failed to regenerate options", err);
            setErrorMessage("產生新圖片時發生錯誤，請稍後再試");
            setIsRegenerating(false);
            // Remove failed request
            ongoingRequestsRef.current.delete(card.id);
          }
        });
    } else {
      // No ongoing request for this card, reset all states
      setIsRegenerating(false);
      setShowOptions(false);
      setMnemonicOptions([]);
      setErrorMessage(null);
    }
  }, [card.id]);

  const handleRegenerateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRegenerating) return;

    // Update card status to UPDATING
    if (onUpdateCard) {
      onUpdateCard({ ...card, status: CardStatus.UPDATING });
    }

    // Generate request ID for this specific request
    const requestId = `${card.id}-${Date.now()}`;
    
    // Create the request promise
    const requestPromise = generateMnemonicOptions(word);
    
    // Save the ongoing request for this card
    ongoingRequestsRef.current.set(card.id, {
      requestId,
      promise: requestPromise
    });

    setIsRegenerating(true);
    setErrorMessage(null);
    setShowOptions(false);
    setShowMnemonicButton(false); // Hide button when starting generation
    
    try {
      // Fetch 2 new alternatives
      const newOptions = await requestPromise;
      
      // Check if this request is still valid (card hasn't changed and request still exists)
      const currentRequest = ongoingRequestsRef.current.get(card.id);
      if (!currentRequest || currentRequest.requestId !== requestId) {
        // Card was switched or request was cancelled, ignore this result
        return;
      }
      
      if (newOptions && newOptions.length > 0) {
        // Add current option as the first option
        const currentOption: MnemonicOption = {
          imageUrl: card.imageUrl || '',
          mnemonicHint: mnemonicHint,
          imagePrompt: card.imagePrompt || card.data.imagePrompt || ''
        };
        const allOptions = [currentOption, ...newOptions];
        setMnemonicOptions(allOptions);
        setShowOptions(true);
      } else {
        setErrorMessage("未能產生新的記憶卡選項，請稍後再試");
        // Clear UPDATING status on error
        if (onUpdateCard) {
          onUpdateCard({ ...card, status: CardStatus.NORMAL });
        }
      }
      setIsRegenerating(false);
      // Remove completed request
      ongoingRequestsRef.current.delete(card.id);
    } catch (err) {
      // Check if this request is still valid
      const currentRequest = ongoingRequestsRef.current.get(card.id);
      if (!currentRequest || currentRequest.requestId !== requestId) {
        // Card was switched or request was cancelled, ignore this error
        return;
      }
      console.error("Failed to regenerate options", err);
      setErrorMessage("產生新圖片時發生錯誤，請稍後再試");
      setIsRegenerating(false);
      // Clear UPDATING status on error
      if (onUpdateCard) {
        onUpdateCard({ ...card, status: CardStatus.NORMAL });
      }
      // Remove failed request
      ongoingRequestsRef.current.delete(card.id);
    }
  };

  const handleRegenerateStyleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRegeneratingStyle || !card.imagePrompt || !card.imageUrl) return;

    // Update card status to UPDATING
    if (onUpdateCard) {
      onUpdateCard({ ...card, status: CardStatus.UPDATING });
    }

    setIsRegeneratingStyle(true);
    setErrorMessage(null);
    setShowOptions(false);
    
    try {
      // Generate 2 alternative style options with same mnemonic
      const options = await generateAlternativeStyleOptions(
        word, 
        card.imagePrompt, 
        card.imageUrl, 
        mnemonicHint
      );
      
      if (options && options.length > 0) {
        setMnemonicOptions(options);
        setShowOptions(true);
      } else {
        setErrorMessage("未能產生新的風格選項，請稍後再試");
        // Clear UPDATING status on error
        if (onUpdateCard) {
          onUpdateCard({ ...card, status: CardStatus.NORMAL });
        }
      }
      setIsRegeneratingStyle(false);
    } catch (err) {
      console.error("Failed to regenerate style options", err);
      setErrorMessage("產生新風格圖片時發生錯誤，請稍後再試");
      setIsRegeneratingStyle(false);
      // Clear UPDATING status on error
      if (onUpdateCard) {
        onUpdateCard({ ...card, status: CardStatus.NORMAL });
      }
    }
  };

  const handleSelectOption = async (option: MnemonicOption, e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear ongoing request since user has selected an option
    ongoingRequestsRef.current.delete(card.id);
    
    if (onUpdateCard) {
      const updatedCard = {
        ...card,
        imageUrl: option.imageUrl,
        data: {
          ...card.data,
          mnemonicHint: option.mnemonicHint,
          imagePrompt: option.imagePrompt
        },
        status: CardStatus.UPDATING
      };
      // Update UI immediately with UPDATING status
      onUpdateCard(updatedCard);
      // Persist and clear status
      await saveCard(updatedCard);
      // Update again with cleared status
      const finalCard = { ...updatedCard, status: CardStatus.NORMAL };
      onUpdateCard(finalCard);
    }
    setShowOptions(false);
  };

  const handleCancelSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear ongoing request since user cancelled
    ongoingRequestsRef.current.delete(card.id);
    setShowOptions(false);
    // Clear UPDATING status when user cancels
    if (onUpdateCard && card.status === CardStatus.UPDATING) {
      onUpdateCard({ ...card, status: CardStatus.NORMAL });
    }
  };

  // Render syllables with visual stress indicator
  const renderPhonics = () => {
    const hasMultipleSyllables = syllables.length >= 2;
    const renderSyllable = (syl: string, idx: number) => {
      const isStressed = idx === stressIndex;
      const showStressDot = hasMultipleSyllables && isStressed;
      
      return (
        <span 
          key={idx} 
          className={`relative inline-block ${isPreview ? 'text-lg' : 'text-2xl'} font-normal text-dark border-b-2 border-blue-700`}
        >
          {/* Teal vertical line above stressed syllable (only for words with 2+ syllables) */}
          {showStressDot && (
            <span 
              className={`absolute left-0 w-0.5 bg-teal-400`}
              style={{ 
                height: '0.3em',
                bottom: 'calc(100% - 0.2em)'
              }}
            ></span>
          )}
          {syl}
        </span>
      );
    };

    return (
      <div className={`phonics-section flex flex-col items-center ${isPreview ? 'gap-1 mb-1.5' : 'gap-2 mb-4'} bg-white/50 ${isPreview ? 'p-1.5' : 'p-2'} rounded-xl border border-white/60`}>
        <div className="phonics-syllables flex items-center gap-1 font-mono">
          {syllables.map((syl, idx) => renderSyllable(syl, idx))}
        </div>
        <span className={`phonics-ipa text-slate-400 font-sans tracking-wide ${isPreview ? 'text-[10px]' : 'text-sm'} bg-slate-100 px-3 py-1 rounded-full`}>/{ipa}/</span>
      </div>
    );
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 如果點擊的是按鈕或其他可交互元素，不觸發翻卡
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    if (!showOptions && onFlip) {
      onFlip();
    }
  };

  // Render mnemonic hint with English word annotations
  const renderMnemonicHint = (hint: string) => {
    // Pattern to match 「中文詞」(英文單字)
    const pattern = /「([^」]+)」\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'annotated'; text: string; english?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(hint)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          text: hint.substring(lastIndex, match.index)
        });
      }
      // Add the annotated part
      parts.push({
        type: 'annotated',
        text: match[1], // Chinese text
        english: match[2] // English word
      });
      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < hint.length) {
      parts.push({
        type: 'text',
        text: hint.substring(lastIndex)
      });
    }

    // If no matches found, return original text
    if (parts.length === 0) {
      return <span>{hint}</span>;
    }

    return (
      <>
        {parts.map((part, idx) => {
          if (part.type === 'annotated' && part.english) {
            return (
              <span key={idx}>
                <span className="text-gray-800">「{part.text}」</span>
                <span className="text-blue-600 font-semibold ml-0.5">({part.english})</span>
              </span>
            );
          }
          return <span key={idx}>{part.text}</span>;
        })}
      </>
    );
  };

  // Determine card status (prioritize local state over card.status)
  const cardStatus = isRegenerating ? CardStatus.UPDATING : (card.status || CardStatus.NORMAL);
  const isGenerating = cardStatus === CardStatus.GENERATING;
  const isUpdating = cardStatus === CardStatus.UPDATING;

  // Render status badge
  const renderStatusBadge = () => {
    if (cardStatus === CardStatus.NORMAL) return null;
    
    const statusText = isGenerating ? '正在產生' : '正在更新';
    return (
      <div className={`absolute ${isPreview ? 'top-2 left-2' : 'top-3 left-3'} z-50 bg-blue-600 text-white ${isPreview ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-pulse`}>
        <div className={`${isPreview ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full bg-white animate-spin`} style={{
          border: '2px solid transparent',
          borderTopColor: 'currentColor',
          borderRightColor: 'currentColor'
        }}></div>
        {statusText}
      </div>
    );
  };

  return (
    <div 
      className={`card-container relative w-full ${isPreview ? 'max-w-[420px] h-[85vh] max-h-[85vh]' : 'max-w-[360px] h-[640px]'} perspective-1000 mx-auto select-none ${(isGenerating || isUpdating) ? 'opacity-90' : ''}`}
      onClick={handleCardClick}
    >
      {renderStatusBadge()}
      <div 
        className={`card-flip-wrapper relative w-full h-full duration-700 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        {/* FRONT SIDE */}
        <div className={`card-front absolute w-full h-full bg-gradient-to-br from-white to-blue-50 ${isPreview ? 'rounded-2xl' : 'rounded-[2.5rem]'} shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] ${isPreview ? 'p-6' : 'p-8'} flex flex-col items-center justify-center backface-hidden border-4 border-white ring-4 ring-blue-100/50 ${isFlipped ? 'pointer-events-none' : ''}`}>
          <div className={`card-front-icon absolute ${isPreview ? 'top-6 right-6' : 'top-8 right-8'} text-sky-300 animate-pulse`}>
             <Icons.Book size={isPreview ? 24 : 32} />
          </div>
          
          <div className="card-front-content flex-1 flex flex-col items-center justify-center w-full z-10">
            <h2 className={`card-front-word ${isPreview ? 'text-5xl mb-4' : 'text-6xl mb-6'} font-black text-dark text-center break-words w-full tracking-tighter drop-shadow-sm`}>{word}</h2>
            <div className={`card-front-ipa bg-sky-100 text-sky-600 px-4 py-1 rounded-full ${isPreview ? 'text-base' : 'text-lg'} font-bold opacity-80`}>
              /{ipa}/
            </div>
          </div>

          <div className={`card-front-flip-hint mt-auto text-primary ${isPreview ? 'text-sm' : 'text-base'} font-bold flex items-center gap-2 bg-white ${isPreview ? 'px-4 py-2' : 'px-6 py-3'} rounded-full shadow-lg border border-blue-50 animate-bounce cursor-pointer`}>
            <Icons.Flip size={isPreview ? 16 : 20} /> 點擊翻卡
          </div>
          
          {/* Decorative blobs */}
          <div className="card-front-decorative-blob-1 absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
          <div className="card-front-decorative-blob-2 absolute top-[-20px] right-[-20px] w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        </div>

        {/* BACK SIDE */}
        <div className={`card-back absolute w-full h-full bg-white ${isPreview ? 'rounded-2xl' : 'rounded-[2.5rem]'} shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] backface-hidden rotate-y-180 ${isPreview ? 'overflow-hidden' : 'overflow-hidden'} flex flex-col border-4 border-white ring-4 ring-purple-100/50`}>
          
          <div 
            className={`card-back-scroll-container ${isPreview ? 'flex flex-col h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'flex-1 overflow-y-auto custom-scrollbar'}`}
            style={{ pointerEvents: 'auto' }}
            onWheel={(e) => {
              // 確保滾動事件可以正常傳遞
              const target = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = target;
              const isAtTop = scrollTop === 0;
              const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
              
              // 如果已經在頂部或底部，允許默認行為（可能觸發父元素滾動）
              if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                return;
              }
              
              // 否則阻止事件冒泡，確保在當前容器內滾動
              e.stopPropagation();
            }}
          >
            
            {/* 1. Word Header */}
            <div className={`word-header text-center ${isPreview ? 'pt-3 pb-0.5 px-3 flex-shrink-0' : 'pt-6 pb-2 px-4'} bg-gradient-to-b from-blue-50 to-white`}>
              <h3 className={`word-header-title ${isPreview ? 'text-xl mb-0.5' : 'text-3xl mb-2'} font-black text-dark`}>{word}</h3>
              {renderPhonics()}
              <p className={`word-header-definition ${isPreview ? 'text-base mt-0.5' : 'text-xl mt-2'} text-dark font-bold bg-yellow-100 inline-block px-3 py-1 rounded-lg shadow-sm border border-yellow-200 transform -rotate-1`}>{definition}</p>
            </div>

            {/* 2. Integrated Mnemonic Image Card */}
            <div className={`mnemonic-image-card ${isPreview ? 'mx-3 my-1' : 'mx-4 my-2'} relative group flex-shrink-0`}>
              <div className={`mnemonic-image-wrapper ${isPreview ? 'rounded-xl' : 'rounded-2xl'} overflow-hidden shadow-lg border-2 border-slate-100 bg-white`}>
                {/* Image Area - No Padding */}
                <div className={`mnemonic-image-area relative w-full aspect-square bg-slate-100 flex items-center justify-center`}>
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={word} className="w-full h-full object-contain pointer-events-none" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                      <Icons.Image size={48} />
                      <span className="text-sm mt-2">無圖片</span>
                    </div>
                  )}

                  {/* Regenerate Style Button (Floating) - 換一張圖 */}
                  {allowEdit && !showOptions && !isRegeneratingStyle && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerateStyleClick(e);
                      }}
                      onMouseDown={(e) => {
                        // 只在實際點擊時阻止，不影響滾動
                        if (e.button === 0) {
                          e.stopPropagation();
                        }
                      }}
                      className={`regenerate-style-button absolute ${isPreview ? 'bottom-2 right-2' : 'bottom-3 right-3'} ${isPreview ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center bg-white text-primary rounded-full shadow-xl transition-all z-[100] border-2 border-primary/20 hover:bg-primary hover:text-white active:scale-90 cursor-pointer`}
                      title="換一張圖"
                      type="button"
                    >
                      <Icons.Regenerate 
                        size={isPreview ? 16 : 20} 
                      />
                    </button>
                  )}

                  {/* Selection Overlay */}
                  {showOptions && (
                    <div className="selection-overlay absolute inset-0 bg-white/95 z-30 flex flex-col p-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="selection-overlay-title text-center text-xs font-bold text-gray-400 mb-1">請選擇喜歡的記憶卡</div>
                      <div className="selection-overlay-options flex-1 grid grid-rows-3 gap-2 h-full overflow-hidden">
                        {mnemonicOptions.map((opt, idx) => (
                          <div 
                            key={idx} 
                            onClick={(e) => handleSelectOption(opt, e)}
                            className="selection-option flex items-center gap-2 p-1 rounded-xl border-2 border-transparent hover:border-primary hover:bg-blue-50 cursor-pointer transition-all bg-gray-50 overflow-hidden"
                          >
                            <img src={opt.imageUrl} className="selection-option-image w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0" />
                            <p className="selection-option-hint text-xs text-left text-gray-700 font-medium line-clamp-3 leading-tight">{opt.mnemonicHint}</p>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={handleCancelSelection}
                        className="selection-overlay-cancel-button mt-1 py-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                      >
                        取消
                      </button>
                    </div>
                  )}
                  
                  {/* Loading Overlay - 換一個聯想法 */}
                  {isRegenerating && (
                    <div 
                      className="loading-overlay absolute inset-0 bg-gradient-to-br from-white/95 to-blue-50/95 z-30 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="loading-overlay-content flex flex-col items-center gap-3">
                        <div className="loading-overlay-spinner relative">
                          <div className="animate-spin text-primary">
                            <Icons.Regenerate size={isPreview ? 40 : 48} />
                          </div>
                          <div className="absolute inset-0 animate-ping text-primary/20">
                            <Icons.Regenerate size={isPreview ? 40 : 48} />
                          </div>
                        </div>
                        <div className="loading-overlay-text flex flex-col items-center gap-1">
                          <span className={`loading-overlay-main-text ${isPreview ? 'text-sm' : 'text-base'} font-bold text-primary animate-pulse`}>
                            正在構思新點子...
                          </span>
                          <span className={`loading-overlay-sub-text ${isPreview ? 'text-xs' : 'text-sm'} text-slate-500 font-medium`}>
                            這可能需要幾秒鐘
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading Overlay - 換一張圖 */}
                  {isRegeneratingStyle && (
                    <div 
                      className="loading-overlay absolute inset-0 bg-gradient-to-br from-white/95 to-purple-50/95 z-30 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="loading-overlay-content flex flex-col items-center gap-3">
                        <div className="loading-overlay-spinner relative">
                          <div className="animate-spin text-primary">
                            <Icons.Regenerate size={isPreview ? 40 : 48} />
                          </div>
                          <div className="absolute inset-0 animate-ping text-primary/20">
                            <Icons.Regenerate size={isPreview ? 40 : 48} />
                          </div>
                        </div>
                        <div className="loading-overlay-text flex flex-col items-center gap-1">
                          <span className={`loading-overlay-main-text ${isPreview ? 'text-sm' : 'text-base'} font-bold text-primary animate-pulse`}>
                            正在產生新風格圖片...
                          </span>
                          <span className={`loading-overlay-sub-text ${isPreview ? 'text-xs' : 'text-sm'} text-slate-500 font-medium`}>
                            這可能需要幾秒鐘
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMessage && !isRegenerating && !isRegeneratingStyle && (
                    <div 
                      className="error-overlay absolute inset-0 bg-red-50/95 z-30 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="error-overlay-content flex flex-col items-center gap-3 px-4">
                        <div className="error-overlay-icon text-red-500">
                          <Icons.Regenerate size={isPreview ? 32 : 40} />
                        </div>
                        <div className="error-overlay-text flex flex-col items-center gap-2">
                          <span className={`error-overlay-message ${isPreview ? 'text-sm' : 'text-base'} font-bold text-red-600 text-center`}>
                            {errorMessage}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setErrorMessage(null);
                            }}
                            className={`error-overlay-close-button ${isPreview ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'} bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors`}
                          >
                            關閉
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Integrated Hint - Attached directly below */}
                <div 
                  className={`mnemonic-hint bg-amber-50 ${isPreview ? 'p-2.5' : 'p-4'} border-t-2 border-amber-100 relative overflow-hidden group`}
                  onTouchStart={(e) => {
                    // Mobile/Tablet: Long press detection
                    e.stopPropagation();
                    const touchTarget = e.currentTarget;
                    
                    // Clear any existing timer
                    if (longPressTimerRef.current !== null) {
                      clearTimeout(longPressTimerRef.current);
                    }
                    
                    const handleTouchEnd = () => {
                      if (longPressTimerRef.current !== null) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                      touchTarget.removeEventListener('touchend', handleTouchEnd);
                      touchTarget.removeEventListener('touchmove', handleTouchMove);
                    };
                    
                    const handleTouchMove = () => {
                      if (longPressTimerRef.current !== null) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                      touchTarget.removeEventListener('touchend', handleTouchEnd);
                      touchTarget.removeEventListener('touchmove', handleTouchMove);
                    };
                    
                    longPressTimerRef.current = window.setTimeout(() => {
                      setShowMnemonicButton(true);
                      longPressTimerRef.current = null;
                      touchTarget.removeEventListener('touchend', handleTouchEnd);
                      touchTarget.removeEventListener('touchmove', handleTouchMove);
                    }, 500); // 500ms long press
                    
                    touchTarget.addEventListener('touchend', handleTouchEnd, { once: true });
                    touchTarget.addEventListener('touchmove', handleTouchMove, { once: true });
                  }}
                  onMouseEnter={() => {
                    // PC: Show button on hover
                    setShowMnemonicButton(true);
                  }}
                  onMouseLeave={() => {
                    // PC: Hide button when not hovering
                    setShowMnemonicButton(false);
                  }}
                >
                   <div className={`mnemonic-hint-accent absolute -left-2 ${isPreview ? 'top-2' : 'top-3'} w-1 ${isPreview ? 'h-6' : 'h-8'} bg-amber-400 rounded-r`}></div>
                   <div className="mnemonic-hint-content flex gap-2">
                     <Icons.Flash size={isPreview ? 14 : 18} className="mnemonic-hint-icon text-amber-500 flex-shrink-0 mt-0.5" />
                     <p className={`mnemonic-hint-text ${isPreview ? 'text-sm' : 'text-base'} text-gray-800 font-medium leading-snug tracking-wide text-justify`}>
                       {renderMnemonicHint(mnemonicHint)}
                     </p>
                   </div>
                   
                   {/* 換一個聯想法按鈕 - 顯示在右下角 */}
                   {allowEdit && showMnemonicButton && !isRegenerating && (
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         handleRegenerateClick(e);
                         setShowMnemonicButton(false);
                       }}
                       onMouseDown={(e) => {
                         if (e.button === 0) {
                           e.stopPropagation();
                         }
                       }}
                       disabled={isRegenerating}
                       className={`absolute ${isPreview ? 'bottom-2 right-2' : 'bottom-3 right-3'} ${isPreview ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center bg-amber-500 text-white rounded-full shadow-lg transition-all z-[100] border-2 border-amber-600 hover:bg-amber-600 active:scale-90 cursor-pointer animate-in fade-in zoom-in-95 duration-200`}
                       title="換一個聯想法"
                       type="button"
                     >
                       <Icons.Flash 
                         size={isPreview ? 12 : 16} 
                       />
                     </button>
                   )}
                </div>
              </div>
            </div>

            {/* 3. Etymology (Roots) */}
            {roots && roots.length > 0 && (
              <div className={`etymology-section ${isPreview ? 'px-3 py-0.5 flex-shrink-0' : 'px-6 py-2'}`}>
                <h4 className="etymology-section-title text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                   <Icons.Search size={14} /> 單字拆解
                </h4>
                <div className="etymology-roots flex flex-wrap gap-1.5">
                  {roots.map((r, i) => (
                    <div key={i} className={`etymology-root-item flex items-center bg-white border border-slate-100 rounded-lg ${isPreview ? 'p-1' : 'p-1.5'} shadow-sm`}>
                      <span className={`etymology-root-part px-2 py-0.5 rounded text-xs font-mono font-bold mr-2
                        ${r.type === 'prefix' ? 'bg-sky-100 text-sky-700' : 
                          r.type === 'suffix' ? 'bg-pink-100 text-pink-700' : 
                          'bg-green-100 text-green-700'}`}>
                        {r.part}
                      </span>
                      <span className="etymology-root-meaning text-slate-600 text-xs font-medium">{r.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Sentence */}
            <div className={`sentence-section ${isPreview ? 'px-3 py-0.5 pb-2 flex-shrink-0' : 'px-6 py-2 pb-8'}`}>
                <h4 className="sentence-section-title text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                   <Icons.Book size={14} /> 例句
                </h4>
               <div className={`sentence-content bg-slate-50 ${isPreview ? 'p-2.5' : 'p-4'} ${isPreview ? 'rounded-xl' : 'rounded-2xl'} border-2 border-slate-100`}>
                  <p className={`sentence-english ${isPreview ? 'text-xs mb-1' : 'text-sm mb-2'} text-slate-800 font-medium leading-relaxed`}>"{sentence}"</p>
                  <p className={`sentence-translation text-xs text-slate-500 font-medium`}>{sentenceTranslation}</p>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardComponent;