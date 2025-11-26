import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { getCards, saveCard, processReview } from '../services/storageService';
import FlashcardComponent from './FlashcardComponent';
import { Icons } from '../constants';

interface PracticeModeProps {
  onFinish: () => void;
}

const PracticeMode: React.FC<PracticeModeProps> = ({ onFinish }) => {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCards = async () => {
      const allCards = await getCards();
      const now = Date.now();
      const dueCards = allCards.filter(c => c.nextReviewDate <= now);
      dueCards.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
      
      setQueue(dueCards);
      setIsLoading(false);
    };
    loadCards();
  }, []);

  // Allow updating card content during review (e.g. changing image)
  const handleUpdateCurrentCard = (updatedCard: Flashcard) => {
    const newQueue = [...queue];
    newQueue[currentIndex] = updatedCard;
    setQueue(newQueue);
  };

  const handleReview = async (quality: number) => {
    if (currentIndex >= queue.length) return;

    const currentCard = queue[currentIndex];
    const updatedCard = processReview(currentCard, quality);
    
    // Async save
    await saveCard(updatedCard);

    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full font-bold text-slate-400">載入中...</div>;
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in zoom-in duration-500">
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-lg animate-bounce">
          <Icons.Check size={64} />
        </div>
        <h2 className="text-4xl font-black text-dark mb-4">全部完成！</h2>
        <p className="text-slate-500 mb-10 max-w-xs font-medium text-lg">
          你已經複習完所有單字了，
          <br/>太厲害了！
        </p>
        <button 
          onClick={onFinish}
          className="px-8 py-4 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all font-bold text-xl shadow-xl hover:-translate-y-1 active:scale-95"
        >
          回首頁
        </button>
      </div>
    );
  }

  if (currentIndex >= queue.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-3xl font-black text-dark mb-4">練習結束！</h2>
        <p className="text-slate-500 mb-8 text-lg">你今天複習了 {queue.length} 個單字</p>
        <button 
          onClick={onFinish}
          className="px-8 py-4 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all font-bold shadow-lg"
        >
          回首頁
        </button>
      </div>
    );
  }

  const currentCard = queue[currentIndex];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4 text-sm text-slate-400 font-bold bg-white/50 p-3 rounded-xl">
        <span>複習挑戰</span>
        <div className="flex items-center gap-2">
           <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
             <div 
               className="h-full bg-secondary transition-all duration-500" 
               style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
             ></div>
           </div>
           <span>{currentIndex + 1} / {queue.length}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center mb-4 relative z-10">
        <FlashcardComponent 
          card={currentCard} 
          isFlipped={isFlipped} 
          onFlip={() => setIsFlipped(!isFlipped)} 
          onUpdateCard={handleUpdateCurrentCard}
        />
      </div>

      {/* Response Buttons */}
      <div className={`grid grid-cols-4 gap-3 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <button 
          onClick={() => handleReview(0)}
          className="flex flex-col items-center p-3 rounded-2xl bg-red-50 text-red-500 border-2 border-red-100 hover:bg-red-100 hover:border-red-200 transition-all active:scale-95"
        >
          <span className="text-2xl mb-1">😫</span>
          <span className="text-sm font-bold">忘記了</span>
        </button>
        <button 
          onClick={() => handleReview(3)}
          className="flex flex-col items-center p-3 rounded-2xl bg-orange-50 text-orange-500 border-2 border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-all active:scale-95"
        >
          <span className="text-2xl mb-1">🤔</span>
          <span className="text-sm font-bold">有點難</span>
        </button>
        <button 
          onClick={() => handleReview(4)}
          className="flex flex-col items-center p-3 rounded-2xl bg-sky-50 text-sky-500 border-2 border-sky-100 hover:bg-sky-100 hover:border-sky-200 transition-all active:scale-95"
        >
          <span className="text-2xl mb-1">😀</span>
          <span className="text-sm font-bold">記得</span>
        </button>
        <button 
          onClick={() => handleReview(5)}
          className="flex flex-col items-center p-3 rounded-2xl bg-green-50 text-green-500 border-2 border-green-100 hover:bg-green-100 hover:border-green-200 transition-all active:scale-95"
        >
          <span className="text-2xl mb-1">😎</span>
          <span className="text-sm font-bold">超簡單</span>
        </button>
      </div>
      
      {!isFlipped && (
        <div className="text-center text-slate-400 font-bold animate-pulse mt-4">
          點擊卡片看答案
        </div>
      )}
    </div>
  );
};

export default PracticeMode;