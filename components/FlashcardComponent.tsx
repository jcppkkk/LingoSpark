import React, { useEffect, useRef, useState } from 'react';
import { Flashcard, CardStatus } from '../types';
import { Icons } from '../constants';
import { speakWord, speakSentence } from '../services/speechService';

interface FlashcardComponentProps {
  card: Flashcard;
  isFlipped?: boolean; // 改為可選，如果未提供則內部管理
  onFlip?: () => void; // 改為可選
  onUpdateCard?: (updatedCard: Flashcard) => void;
  allowEdit?: boolean;
  isPreview?: boolean;
  voice?: SpeechSynthesisVoice | null;
  autoPlay?: boolean; // 是否自動播放，預設為 true
  showSpeechButton?: boolean; // 是否顯示發音按鈕，預設為 true
}

// @ARCH:START FlashcardComponent - UI: 統一單字卡組件（支援翻面、發音）
const FlashcardComponent: React.FC<FlashcardComponentProps> = ({ 
  card, 
  isFlipped: externalIsFlipped,
  onFlip: externalOnFlip,
  allowEdit: _allowEdit = true,
  isPreview = false,
  voice = null,
  autoPlay = true,
  showSpeechButton = true
}) => {
  const { word, definition, ipa, syllables, stressIndex, roots, sentence, sentenceTranslation } = card.data;
  
// @ARCH: FlashcardComponent.UX.卡片翻面與語音播放狀態管理
  // 內部翻面狀態管理（如果外部未提供）
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);
  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Determine card status
  const cardStatus = card.status || CardStatus.NORMAL;
  const isGenerating = cardStatus === CardStatus.GENERATING;
  
// @ARCH: FlashcardComponent.UX.處理卡片翻面邏輯
  // 用於追蹤是否已經播放過，避免重複播放
  const lastFlippedState = useRef<boolean | null>(null);
  const lastWordRef = useRef<string>('');
  
  // 處理翻面
  const handleFlip = () => {
    if (externalOnFlip) {
      externalOnFlip();
// @ARCH: FlashcardComponent.FEAT.手動語音播放功能
    } else {
      setInternalIsFlipped(!internalIsFlipped);
    }
  };
  
  // 處理手動發音（正面：單字，背面：例句）
  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      if (!isFlipped) {
        // 正面：播放單字
        await speakWord(word, voice || undefined);
      } else {
        // 背面：播放例句
        if (sentence) {
          await speakSentence(sentence, voice || undefined);
        }
      }
    } catch (error) {
      console.error('語音播放失敗:', error);
    } finally {
      setIsSpeaking(false);
    }
  };
  
  // @ARCH: FlashcardComponent - FEAT: 自動播放語音
  // 自動播放：正面播放單字，背面播放例句
  useEffect(() => {
    // 如果單字改變，重置狀態
    if (word !== lastWordRef.current) {
      lastWordRef.current = word;
      lastFlippedState.current = null;
      // 如果使用內部狀態管理，重置為正面
      if (externalIsFlipped === undefined) {
        setInternalIsFlipped(false);
      }
    }
    
    // 如果禁用自動播放或正在生成，不播放
    if (!autoPlay || isGenerating) return;
    
    // 只在翻轉狀態改變時播放
    if (lastFlippedState.current !== isFlipped) {
      lastFlippedState.current = isFlipped;
      
      // 延遲一點播放，確保動畫開始
      const timer = setTimeout(() => {
        if (!isFlipped) {
          // 正面：播放單字
// @ARCH: FlashcardComponent.UI.音標與音節顯示
          speakWord(word, voice || undefined).catch(error => {
            console.error('自動播放單字失敗:', error);
          });
        } else {
          // 背面：播放例句
          if (sentence) {
            speakSentence(sentence, voice || undefined).catch(error => {
              console.error('自動播放例句失敗:', error);
            });
          }
        }
      }, 300); // 等待翻轉動畫開始
      
      return () => clearTimeout(timer);
    }
  }, [isFlipped, word, sentence, voice, autoPlay, isGenerating, externalIsFlipped]);

  // Render syllables with visual stress indicator
  const renderPhonics = () => {
    const hasMultipleSyllables = syllables.length >= 2;
    const renderSyllable = (syl: string, idx: number) => {
      const isStressed = idx === stressIndex;
      const showStressMark = hasMultipleSyllables && isStressed;
      
      return (
        <span 
          key={idx} 
          className={`relative inline-block ${isPreview ? 'text-lg' : 'text-2xl'} font-normal text-dark border-b-2 ${isStressed ? 'border-teal-500 border-b-4' : 'border-blue-700'}`}
        >
          {/* 重音符號標記 */}
          {showStressMark && (
            <span 
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-teal-500 font-bold"
              style={{ fontSize: '0.6em' }}
            >
              ′
            </span>
// @ARCH: FlashcardComponent.UX.卡片點擊互動
          )}
          {syl}
        </span>
      );
    };

    return (
      <div className={`phonics-section flex flex-col items-center ${isPreview ? 'gap-1 mb-1.5' : 'gap-2 mb-4'} bg-white/50 ${isPreview ? 'p-1.5' : 'p-2'} rounded-xl border border-white/60`}>
        {/* @ARCH: FlashcardComponent.UI.卡片狀態標籤顯示 */}
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
    handleFlip();
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (cardStatus === CardStatus.NORMAL) return null;
    
    const statusText = isGenerating ? '正在產生' : '正在更新';
    return (
      <div className={`absolute ${isPreview ? 'top-2 left-2' : 'top-3 left-3'} z-50 bg-blue-600 text-white ${isPreview ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-pulse`}>
{/* @ARCH: FlashcardComponent.UI.單字卡正面顯示 */}
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
      className={`card-container relative w-full ${isPreview ? 'max-w-[420px] h-full max-h-full' : 'max-w-[360px] h-[640px]'} perspective-1000 mx-auto select-none ${isGenerating ? 'opacity-90' : ''}`}
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
          
          {/* 發音按鈕 */}
          {showSpeechButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak();
              }}
              disabled={isSpeaking}
              className={`absolute ${isPreview ? 'top-6 left-6' : 'top-8 left-8'} w-12 h-12 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 z-20`}
              title="播放發音"
            >
              {isSpeaking ? (
                <Icons.Regenerate size={isPreview ? 18 : 20} className="animate-spin" />
              ) : (
                <Icons.Audio size={isPreview ? 18 : 20} />
              )}
            </button>
          )}
          
          <div className="card-front-content flex-1 flex flex-col items-center justify-center w-full z-10">
            {/* 圖片顯示區域 */}
            {card.imageUrl && (
              <div className={`card-front-image mb-4 ${isPreview ? 'w-32 h-32' : 'w-40 h-40'} flex-shrink-0`}>
                <img 
                  src={card.imageUrl} 
// @ARCH: FlashcardComponent.UI.單字卡背面顯示
                  alt={word}
                  className="w-full h-full object-contain rounded-2xl shadow-lg border-2 border-white/80"
                  onError={(e) => {
                    // 圖片載入失敗時隱藏圖片元素
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
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
        <div className={`card-back absolute w-full h-full bg-white ${isPreview ? 'rounded-2xl' : 'rounded-[2.5rem]'} shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] backface-hidden rotate-y-180 ${isPreview ? 'overflow-hidden' : 'overflow-hidden'} flex flex-col border-4 border-white ring-4 ring-purple-100/50 ${!isFlipped ? 'pointer-events-none' : ''}`}>
          
          {/* 發音按鈕（背面） */}
          {showSpeechButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak();
              }}
              disabled={isSpeaking}
              className={`absolute ${isPreview ? 'top-4 right-4' : 'top-6 right-6'} w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 z-20`}
              title="播放例句"
            >
              {isSpeaking ? (
                <Icons.Regenerate size={isPreview ? 18 : 20} className="animate-spin" />
              ) : (
                <Icons.Audio size={isPreview ? 18 : 20} />
              )}
            </button>
          )}
          
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

            {/* 2. Etymology (Roots) */}
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

            {/* 3. Sentence */}
            <div className={`sentence-section ${isPreview ? 'px-3 py-0.5 pb-2 flex-shrink-0' : 'px-6 py-2 pb-8'}`}>
                <h4 className="sentence-section-title text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                   <Icons.Book size={14} /> 例句
                </h4>
               <div className={`sentence-content bg-slate-50 ${isPreview ? 'p-2.5' : 'p-4'} ${isPreview ? 'rounded-xl' : 'rounded-2xl'} border-2 border-slate-100`}>
                  <p className={`sentence-english ${isPreview ? 'text-xs mb-1' : 'text-sm mb-2'} text-slate-800 font-medium leading-relaxed`}>&quot;{sentence}&quot;</p>
                  <p className={`sentence-translation text-xs text-slate-500 font-medium`}>{sentenceTranslation}</p>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
// @ARCH:END FlashcardComponent - UI: 統一單字卡組件（支援翻面、發音）

export default FlashcardComponent;
