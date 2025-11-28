import React from 'react';

interface ColoredWordProps {
  word: string;
  syllables?: string[];
  showSyllables?: boolean;
  stressIndex?: number; // 重音節索引
  className?: string;
}

/**
 * ColoredWord 組件
 * 將單字字母標示顏色：母音（a, e, i, o, u）標示為紅色，子音標示為藍色
 * 支援音節拆解顯示
 */
// @ARCH:START ColoredWord - UI: 彩色單字顯示
const ColoredWord: React.FC<ColoredWordProps> = ({ 
  word, 
  syllables, 
  showSyllables = false,
  stressIndex,
  className = '' 
}) => {
  // 判斷是否為母音
// @ARCH: ColoredWord.FEAT.母音判斷功能
  const isVowel = (char: string): boolean => {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'];
    return vowels.includes(char);
  };

// @ARCH: ColoredWord.UI.音節拆解顯示
  // 如果顯示音節拆解
  if (showSyllables && syllables && syllables.length > 0) {
    const hasMultipleSyllables = syllables.length >= 2;
    return (
      <div className={`flex items-center justify-center gap-1 flex-wrap ${className}`}>
        {syllables.map((syllable, syllableIndex) => {
          const isStressed = stressIndex !== undefined && syllableIndex === stressIndex;
          const showStressMark = hasMultipleSyllables && isStressed;
          
          return (
            <span key={syllableIndex} className="relative inline-flex items-center gap-0.5">
              {showStressMark && (
                <span 
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-teal-500 font-bold z-10"
                  style={{ fontSize: '0.5em' }}
                >
                  ′
                </span>
              )}
              {syllable.split('').map((char, charIndex) => {
                const isVowelChar = isVowel(char);
                return (
                  <span
                    key={`${syllableIndex}-${charIndex}`}
                    className={`font-bold ${
                      isVowelChar 
                        ? 'text-red-500' 
                        : 'text-blue-500'
                    } ${isStressed ? 'text-teal-600' : ''}`}
                    style={{ fontSize: 'inherit' }}
                  >
                    {char}
                  </span>
                );
              })}
              {syllableIndex < syllables.length - 1 && (
                <span className="text-slate-300 mx-0.5">·</span>
              )}
            </span>
          );
        })}
      </div>
    );
  }
// @ARCH: ColoredWord.UI.單字顏色標示

  // 不顯示音節拆解，直接標示顏色
  return (
    <div className={`inline-flex items-center ${className}`}>
      {word.split('').map((char, index) => {
        const isVowelChar = isVowel(char);
        return (
          <span
            key={index}
            className={`font-bold ${
              isVowelChar 
                ? 'text-red-500' 
                : 'text-blue-500'
            }`}
            style={{ fontSize: 'inherit' }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
// @ARCH:END ColoredWord - UI: 彩色單字顯示

export default ColoredWord;

