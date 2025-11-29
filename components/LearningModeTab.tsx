import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import FlashcardComponent from './FlashcardComponent';

interface LearningModeTabProps {
  card: Flashcard;
  voice: SpeechSynthesisVoice | null;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalCards: number;
}

// @ARCH:START LearningModeTab - UI: 學習模式單字卡（使用統一 FlashcardComponent）
const LearningModeTab: React.FC<LearningModeTabProps> = ({
  card,
  voice,
  onNext,
  onPrevious,
  currentIndex,
  totalCards
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // 當卡片改變時，重置為正面
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFlipped(false);
  }, [card.id]);

  return (
    <div className="flex flex-col h-full items-center justify-center p-4 md:p-8">
      {/* 進度指示 */}
      <div className="mb-4 text-sm font-bold text-slate-500">
        {currentIndex + 1} / {totalCards}
      </div>

      {/* 單字卡 - 使用統一的 FlashcardComponent */}
      <div className="w-full max-w-2xl h-96 md:h-[500px] flex items-center justify-center">
        <FlashcardComponent
          card={card}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
          allowEdit={false}
          isPreview={false}
          voice={voice}
          autoPlay={true}
          showSpeechButton={true}
        />
      </div>

      {/* 導航按鈕 */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
        >
          ← 上一個
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
        >
          下一個 →
        </button>
      </div>
    </div>
  );
};
// @ARCH:END LearningModeTab - UI: 學習模式單字卡（使用統一 FlashcardComponent）

export default LearningModeTab;

