/**
 * 語音發音服務
 * 使用瀏覽器的 SpeechSynthesis API
 */

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
}

// 快取可用語音列表
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

/**
 * 載入可用語音列表
 */
// @ARCH: speechService - FEAT: 載入可用語音列表
export const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (voicesLoaded && cachedVoices.length > 0) {
      resolve(cachedVoices);
      return;
    }

    const synth = window.speechSynthesis;
    
    // 如果語音已經載入
    if (synth.getVoices().length > 0) {
      cachedVoices = synth.getVoices();
      voicesLoaded = true;
      resolve(cachedVoices);
      return;
    }

    // 等待語音載入
    const onVoicesChanged = () => {
      cachedVoices = synth.getVoices();
      voicesLoaded = true;
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(cachedVoices);
    };

    synth.addEventListener('voiceschanged', onVoicesChanged);
    
    // 超時處理（某些瀏覽器可能不會觸發 voiceschanged）
    setTimeout(() => {
      if (!voicesLoaded) {
        cachedVoices = synth.getVoices();
        voicesLoaded = true;
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(cachedVoices);
      }
    }, 1000);
  });
};

/**
 * 獲取所有可用語音
 */
// @ARCH: speechService - FEAT: 獲取所有可用語音
export const getAvailableVoices = async (): Promise<VoiceOption[]> => {
  const voices = await loadVoices();
  
  return voices.map(voice => ({
    voice,
    name: voice.name,
    lang: voice.lang
  }));
};

/**
 * 尋找預設的英文語音
 * 優先順序：Google US English > English (US) > 任何英文語音
 */
// @ARCH: speechService - FEAT: 尋找預設英文語音
export const findDefaultEnglishVoice = async (): Promise<SpeechSynthesisVoice | null> => {
  const voices = await loadVoices();
  
  if (voices.length === 0) {
    return null;
  }

  // 優先尋找 Google US English
  let defaultVoice = voices.find(v => 
    v.name.includes('Google') && 
    (v.name.includes('US English') || v.name.includes('US'))
  );

  // 其次尋找 English (US)
  if (!defaultVoice) {
    defaultVoice = voices.find(v => 
      v.lang.startsWith('en-US') || 
      (v.lang.startsWith('en') && v.name.includes('US'))
    );
  }

  // 最後尋找任何英文語音
  if (!defaultVoice) {
    defaultVoice = voices.find(v => v.lang.startsWith('en'));
  }

  return defaultVoice || null;
};

/**
 * 播放單字發音
 * @param word 要發音的單字
 * @param voice 可選的語音物件，如果未提供則使用預設英文語音
 */
// @ARCH: speechService - FEAT: 播放單字發音
export const speakWord = async (
  word: string, 
  voice?: SpeechSynthesisVoice
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 停止當前正在播放的語音
    window.speechSynthesis.cancel();

    if (!word || word.trim() === '') {
      reject(new Error('單字不能為空'));
      return;
    }

    const synth = window.speechSynthesis;
    
    // 如果沒有提供語音，使用預設英文語音
    let selectedVoice = voice;
    if (!selectedVoice) {
      findDefaultEnglishVoice().then(defaultVoice => {
        if (!defaultVoice) {
          reject(new Error('找不到可用的英文語音'));
          return;
        }
        selectedVoice = defaultVoice;
        playSpeech();
      }).catch(reject);
      return;
    }

    const playSpeech = () => {
      const utterance = new SpeechSynthesisUtterance(word);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // 設定語音參數
      utterance.rate = 0.9; // 稍微慢一點，適合學習
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = selectedVoice?.lang || 'en-US';

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        // 'interrupted' 錯誤是正常的（例如用戶快速切換卡片或組件卸載）
        // 不需要記錄或拒絕，靜默處理即可
        if (event.error === 'interrupted') {
          resolve(); // 中斷視為成功完成（因為是預期的行為）
          return;
        }
        // 其他錯誤才記錄和拒絕
        console.error('語音播放錯誤:', event);
        reject(new Error(`語音播放失敗: ${event.error || 'unknown error'}`));
      };

      synth.speak(utterance);
    };

    playSpeech();
  });
};

/**
 * 播放句子發音
 * @param sentence 要發音的句子
 * @param voice 可選的語音物件，如果未提供則使用預設英文語音
 */
// @ARCH: speechService - FEAT: 播放句子發音
export const speakSentence = async (
  sentence: string, 
  voice?: SpeechSynthesisVoice
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 停止當前正在播放的語音
    window.speechSynthesis.cancel();

    if (!sentence || sentence.trim() === '') {
      reject(new Error('句子不能為空'));
      return;
    }

    const synth = window.speechSynthesis;
    
    // 如果沒有提供語音，使用預設英文語音
    let selectedVoice = voice;
    if (!selectedVoice) {
      findDefaultEnglishVoice().then(defaultVoice => {
        if (!defaultVoice) {
          reject(new Error('找不到可用的英文語音'));
          return;
        }
        selectedVoice = defaultVoice;
        playSpeech();
      }).catch(reject);
      return;
    }

    const playSpeech = () => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // 設定語音參數（句子可以稍微快一點）
      utterance.rate = 0.95; // 稍微慢一點，適合學習
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = selectedVoice?.lang || 'en-US';

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        // 'interrupted' 錯誤是正常的（例如用戶快速切換卡片或組件卸載）
        // 不需要記錄或拒絕，靜默處理即可
        if (event.error === 'interrupted') {
          resolve(); // 中斷視為成功完成（因為是預期的行為）
          return;
        }
        // 其他錯誤才記錄和拒絕
        console.error('語音播放錯誤:', event);
        reject(new Error(`語音播放失敗: ${event.error || 'unknown error'}`));
      };

      synth.speak(utterance);
    };

    playSpeech();
  });
};

/**
 * 停止當前播放的語音
 */
// @ARCH: speechService - FEAT: 停止語音播放
export const stopSpeaking = (): void => {
  window.speechSynthesis.cancel();
};

/**
 * 檢查瀏覽器是否支援語音合成
 */
// @ARCH: speechService - FEAT: 檢查語音合成支援
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window && window.speechSynthesis !== undefined;
};

