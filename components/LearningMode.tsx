import React, { useState, useEffect } from 'react';
import { Flashcard, LearningMode as LearningModeEnum } from '../types';
import { getCards } from '../services/storageService';
import { getCardsByLevel, getTotalLevels } from '../services/levelService';
import { getAvailableVoices, findDefaultEnglishVoice, VoiceOption } from '../services/speechService';
import { Icons } from '../constants';
import LearningModeTab from './LearningModeTab';
import BlockModeTab from './BlockModeTab';
import DictationModeTab from './DictationModeTab';

interface LearningModeProps {
  onFinish: () => void;
}

// @ARCH:START LearningMode - UI: 兒童學習模式主界面
const LearningMode: React.FC<LearningModeProps> = ({ onFinish }) => {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [currentCards, setCurrentCards] = useState<Flashcard[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(0); // 0 = 全部單字
  const [activeMode, setActiveMode] = useState<LearningModeEnum>(LearningModeEnum.LEARNING);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // @ARCH:START LearningMode - FEAT: 載入單字卡
  // 載入單字卡
  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await getCards();
        setAllCards(cards);
        setCurrentCards(cards);
        setIsLoading(false);
      } catch (error) {
        console.error('載入單字卡失敗:', error);
        setIsLoading(false);
      }
    };
    loadCards();
  }, []);
  // @ARCH:END LearningMode - FEAT: 載入單字卡

  // @ARCH:START LearningMode - FEAT: 載入語音列表
  // 載入語音列表
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voices = await getAvailableVoices();
        setAvailableVoices(voices);
        
        // 尋找預設英文語音
        const defaultVoice = await findDefaultEnglishVoice();
        if (defaultVoice) {
          setSelectedVoice(defaultVoice);
        } else if (voices.length > 0) {
          // 如果找不到預設語音，使用第一個英文語音
          const firstEnglishVoice = voices.find(v => v.lang.startsWith('en'));
          if (firstEnglishVoice) {
            setSelectedVoice(firstEnglishVoice.voice);
          } else if (voices.length > 0) {
            setSelectedVoice(voices[0].voice);
          }
        }
      } catch (error) {
        console.error('載入語音失敗:', error);
      }
    };
    loadVoices();
  }, []);
  // @ARCH:END LearningMode - FEAT: 載入語音列表

  // @ARCH:START LearningMode - UX: Level 選擇與卡片過濾
  // 當選擇的 Level 改變時，更新當前單字卡
  useEffect(() => {
    if (selectedLevel === 0) {
      // 全部單字
      setCurrentCards(allCards);
    } else {
      // 特定 Level
      const levelCards = getCardsByLevel(allCards, selectedLevel);
      setCurrentCards(levelCards);
    }
    setCurrentCardIndex(0); // 重置到第一張卡片
  }, [selectedLevel, allCards]);
  // @ARCH:END LearningMode - UX: Level 選擇與卡片過濾

  // 生成 Level 選項
  const totalLevels = getTotalLevels(allCards.length);
  const levelOptions = [
    { value: 0, label: '全部單字' },
    ...Array.from({ length: totalLevels }, (_, i) => ({
      value: i + 1,
      label: `Level ${i + 1}`
    }))
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-2xl font-bold text-slate-400">載入中...</div>
      </div>
    );
  }

  if (currentCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-6">📚</div>
        <h2 className="text-3xl font-black text-dark mb-4">還沒有單字</h2>
        <p className="text-slate-500 mb-8 text-lg">先去新增一些單字吧！</p>
        <button 
          onClick={onFinish}
          className="px-8 py-4 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all font-bold text-xl shadow-xl hover:-translate-y-1 active:scale-95"
        >
          回首頁
        </button>
      </div>
    );
  }

  const currentCard = currentCards[currentCardIndex];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* @ARCH:START LearningMode - UI: 頂部控制區 */}
      {/* 頂部控制區 */}
      <div className="bg-white/80 backdrop-blur-sm border-b-2 border-purple-200 p-4 shadow-md">
        <div className="max-w-6xl mx-auto">
          {/* @ARCH:START LearningMode - UI: 返回按鈕和標題 */}
          {/* 返回按鈕和標題 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onFinish}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-all active:scale-95"
            >
              <Icons.ArrowLeft size={18} />
              <span>返回</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              🎓 學習模式
            </h1>
            <div className="w-20"></div> {/* 佔位符，保持居中 */}
          </div>
          {/* @ARCH:END LearningMode - UI: 返回按鈕和標題 */}

          {/* @ARCH:START LearningMode - UI: Level 和語音選擇器 */}
          {/* Level 選擇和語音選擇 */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Level 選擇 */}
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-bold text-slate-600 mb-2">選擇 Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-xl font-bold text-lg text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              >
                {levelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.value > 0 && `(${getCardsByLevel(allCards, option.value).length} 個單字)`}
                  </option>
                ))}
              </select>
            </div>

            {/* 語音選擇 */}
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-bold text-slate-600 mb-2">選擇語音</label>
              <select
                value={selectedVoice ? availableVoices.findIndex(v => v.voice === selectedVoice) : -1}
                onChange={(e) => {
                  const index = Number(e.target.value);
                  if (index >= 0 && index < availableVoices.length) {
                    setSelectedVoice(availableVoices[index].voice);
                  }
                }}
                className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-xl font-bold text-lg text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              >
                {availableVoices.map((voiceOption, index) => (
                  <option key={index} value={index}>
                    {voiceOption.name} ({voiceOption.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* @ARCH:END LearningMode - UI: Level 和語音選擇器 */}
        </div>
      </div>
      {/* @ARCH:END LearningMode - UI: 頂部控制區 */}

      {/* @ARCH:START LearningMode - UI: 學習模式標籤切換 */}
      {/* Tabs 切換 */}
      <div className="bg-white/60 backdrop-blur-sm border-b-2 border-purple-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveMode(LearningModeEnum.LEARNING)}
              className={`flex-1 px-6 py-4 font-black text-lg rounded-t-2xl transition-all ${
                activeMode === LearningModeEnum.LEARNING
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                  : 'bg-white/50 text-slate-600 hover:bg-white/80'
              }`}
            >
              📖 學習
            </button>
            <button
              onClick={() => setActiveMode(LearningModeEnum.BLOCK)}
              className={`flex-1 px-6 py-4 font-black text-lg rounded-t-2xl transition-all ${
                activeMode === LearningModeEnum.BLOCK
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105'
                  : 'bg-white/50 text-slate-600 hover:bg-white/80'
              }`}
            >
              🧩 積木
            </button>
            <button
              onClick={() => setActiveMode(LearningModeEnum.DICTATION)}
              className={`flex-1 px-6 py-4 font-black text-lg rounded-t-2xl transition-all ${
                activeMode === LearningModeEnum.DICTATION
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105'
                  : 'bg-white/50 text-slate-600 hover:bg-white/80'
              }`}
            >
              ✍️ 聽寫
            </button>
          </div>
        </div>
      </div>
      {/* @ARCH:END LearningMode - UI: 學習模式標籤切換 */}

      {/* 內容區 */}
      <div className="flex-1 overflow-hidden">
        {activeMode === LearningModeEnum.LEARNING && (
          <LearningModeTab
            card={currentCard}
            voice={selectedVoice}
            onNext={() => setCurrentCardIndex((prev) => (prev + 1) % currentCards.length)}
            onPrevious={() => setCurrentCardIndex((prev) => (prev - 1 + currentCards.length) % currentCards.length)}
            currentIndex={currentCardIndex}
            totalCards={currentCards.length}
          />
        )}
        {activeMode === LearningModeEnum.BLOCK && (
          <BlockModeTab
            card={currentCard}
            voice={selectedVoice}
            onNext={() => setCurrentCardIndex((prev) => (prev + 1) % currentCards.length)}
            onPrevious={() => setCurrentCardIndex((prev) => (prev - 1 + currentCards.length) % currentCards.length)}
            currentIndex={currentCardIndex}
            totalCards={currentCards.length}
          />
        )}
        {activeMode === LearningModeEnum.DICTATION && (
          <DictationModeTab
            card={currentCard}
            voice={selectedVoice}
            onNext={() => setCurrentCardIndex((prev) => (prev + 1) % currentCards.length)}
            onPrevious={() => setCurrentCardIndex((prev) => (prev - 1 + currentCards.length) % currentCards.length)}
            currentIndex={currentCardIndex}
            totalCards={currentCards.length}
          />
        )}
      </div>
    </div>
  );
};
// @ARCH:END LearningMode - UI: 兒童學習模式主界面

export default LearningMode;

