import React, { useState } from 'react';
import { Flashcard, MnemonicOption } from '../types';
import { Icons } from '../constants';
import { generateMnemonicOptions } from '../services/geminiService';
import { saveCard } from '../services/storageService';

interface FlashcardComponentProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
  onUpdateCard?: (updatedCard: Flashcard) => void;
  allowEdit?: boolean;
}

const FlashcardComponent: React.FC<FlashcardComponentProps> = ({ 
  card, 
  isFlipped, 
  onFlip, 
  onUpdateCard,
  allowEdit = true
}) => {
  const { word, definition, ipa, syllables, stressIndex, roots, sentence, sentenceTranslation, mnemonicHint } = card.data;
  
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [mnemonicOptions, setMnemonicOptions] = useState<MnemonicOption[]>([]);

  const handleRegenerateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRegenerating) return;

    setIsRegenerating(true);
    try {
      // Fetch 2 alternatives
      const options = await generateMnemonicOptions(word);
      setMnemonicOptions(options);
      setShowOptions(true);
    } catch (err) {
      console.error("Failed to regenerate options", err);
      alert("抱歉，產生新圖片失敗，請稍後再試！");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSelectOption = async (option: MnemonicOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateCard) {
      const updatedCard = {
        ...card,
        imageUrl: option.imageUrl,
        data: {
          ...card.data,
          mnemonicHint: option.mnemonicHint,
          imagePrompt: option.imagePrompt
        }
      };
      // Persist immediately (Async)
      await saveCard(updatedCard);
      onUpdateCard(updatedCard);
    }
    setShowOptions(false);
  };

  const handleCancelSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(false);
  };

  // Render syllables with visual stress indicator
  const renderPhonics = () => (
    <div className="flex flex-col items-center gap-2 mb-4 bg-white/50 p-2 rounded-xl border border-white/60">
      <div className="flex items-end gap-1 font-mono text-dark">
        {syllables.map((syl, idx) => (
          <span 
            key={idx} 
            className={`
              px-1 rounded transition-all duration-300
              ${idx === stressIndex 
                ? 'text-3xl font-black text-primary border-b-4 border-accent -mt-1 transform -translate-y-1' 
                : 'text-2xl font-normal text-slate-500'}
            `}
          >
            {syl}
          </span>
        ))}
      </div>
      <span className="text-slate-400 font-sans tracking-wide text-sm bg-slate-100 px-3 py-1 rounded-full">/{ipa}/</span>
    </div>
  );

  return (
    <div 
      className="relative w-full max-w-[360px] h-[640px] cursor-pointer perspective-1000 mx-auto select-none"
      onClick={!showOptions ? onFlip : undefined}
    >
      <div 
        className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        {/* FRONT SIDE */}
        <div className="absolute w-full h-full bg-gradient-to-br from-white to-blue-50 rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] p-8 flex flex-col items-center justify-center backface-hidden border-4 border-white ring-4 ring-blue-100/50">
          <div className="absolute top-8 right-8 text-sky-300 animate-pulse">
             <Icons.Book size={32} />
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
            <h2 className="text-6xl font-black text-dark mb-6 text-center break-words w-full tracking-tighter drop-shadow-sm">{word}</h2>
            <div className="bg-sky-100 text-sky-600 px-4 py-1 rounded-full text-lg font-bold opacity-80">
              /{ipa}/
            </div>
          </div>

          <div className="mt-auto text-primary text-base font-bold flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg border border-blue-50 animate-bounce">
            <Icons.Flip size={20} /> 點擊翻卡
          </div>
          
          {/* Decorative blobs */}
          <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute w-full h-full bg-white rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] backface-hidden rotate-y-180 overflow-hidden flex flex-col border-4 border-white ring-4 ring-purple-100/50">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* 1. Word Header */}
            <div className="text-center pt-6 pb-2 px-4 bg-gradient-to-b from-blue-50 to-white">
              <h3 className="text-3xl font-black text-dark mb-2">{word}</h3>
              {renderPhonics()}
              <p className="text-xl text-dark font-bold mt-2 bg-yellow-100 inline-block px-3 py-1 rounded-lg shadow-sm border border-yellow-200 transform -rotate-1">{definition}</p>
            </div>

            {/* 2. Integrated Mnemonic Image Card */}
            <div className="mx-4 my-2 relative group">
              <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-slate-100 bg-white">
                {/* Image Area - No Padding */}
                <div className="relative w-full aspect-square bg-slate-100">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={word} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Icons.Image size={48} />
                      <span className="text-sm mt-2">無圖片</span>
                    </div>
                  )}

                  {/* Regenerate Button (Floating) */}
                  {allowEdit && !showOptions && (
                    <button 
                      onClick={handleRegenerateClick}
                      disabled={isRegenerating}
                      className="absolute bottom-3 right-3 w-12 h-12 flex items-center justify-center bg-white text-primary rounded-full shadow-xl hover:bg-primary hover:text-white transition-all z-20 active:scale-90 border-2 border-primary/20"
                      title="換一張圖"
                    >
                      <Icons.Regenerate size={20} className={isRegenerating ? "animate-spin" : ""} />
                    </button>
                  )}

                  {/* Selection Overlay */}
                  {showOptions && (
                    <div className="absolute inset-0 bg-white/95 z-30 flex flex-col p-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="text-center text-xs font-bold text-gray-400 mb-1">請選擇喜歡的記憶卡</div>
                      <div className="flex-1 grid grid-rows-2 gap-2 h-full overflow-hidden">
                        {mnemonicOptions.map((opt, idx) => (
                          <div 
                            key={idx} 
                            onClick={(e) => handleSelectOption(opt, e)}
                            className="flex items-center gap-2 p-1 rounded-xl border-2 border-transparent hover:border-primary hover:bg-blue-50 cursor-pointer transition-all bg-gray-50 overflow-hidden"
                          >
                            <img src={opt.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0" />
                            <p className="text-xs text-left text-gray-700 font-medium line-clamp-3 leading-tight">{opt.mnemonicHint}</p>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={handleCancelSelection}
                        className="mt-1 py-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                      >
                        取消
                      </button>
                    </div>
                  )}
                  
                  {/* Loading Overlay */}
                  {isRegenerating && (
                    <div className="absolute inset-0 bg-white/80 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="animate-spin text-primary mb-2"><Icons.Regenerate size={32} /></div>
                      <span className="text-sm font-bold text-primary animate-pulse">正在構思新點子...</span>
                    </div>
                  )}
                </div>

                {/* Integrated Hint - Attached directly below */}
                <div className="bg-amber-50 p-4 border-t-2 border-amber-100 relative overflow-hidden">
                   <div className="absolute -left-2 top-3 w-1 h-8 bg-amber-400 rounded-r"></div>
                   <div className="flex gap-2">
                     <Icons.Flash size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                     <p className="text-base text-gray-800 font-medium leading-snug tracking-wide text-justify">
                       {mnemonicHint}
                     </p>
                   </div>
                </div>
              </div>
            </div>

            {/* 3. Etymology (Roots) */}
            {roots && roots.length > 0 && (
              <div className="px-6 py-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                   <Icons.Search size={14} /> 單字拆解
                </h4>
                <div className="flex flex-wrap gap-2">
                  {roots.map((r, i) => (
                    <div key={i} className="flex items-center bg-white border border-slate-100 rounded-lg p-1.5 shadow-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold mr-2
                        ${r.type === 'prefix' ? 'bg-sky-100 text-sky-700' : 
                          r.type === 'suffix' ? 'bg-pink-100 text-pink-700' : 
                          'bg-green-100 text-green-700'}`}>
                        {r.part}
                      </span>
                      <span className="text-slate-600 text-xs font-medium">{r.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Sentence */}
            <div className="px-6 py-4 pb-8">
               <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 relative">
                  <div className="absolute -top-3 left-4 bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">例句</div>
                  <p className="text-sm text-slate-800 mb-2 font-medium leading-relaxed">"{sentence}"</p>
                  <p className="text-xs text-slate-500 font-medium">{sentenceTranslation}</p>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardComponent;