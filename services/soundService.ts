/**
 * 音效播放服務
 * 使用 Web Audio API 生成音效
 */

/**
 * 播放答對音效
 * 生成一個上升的音調，表示成功
 */
// @ARCH: soundService - FEAT: 播放答對音效
export const playCorrectSound = (): void => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 創建一個上升的音調序列
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // 音量包絡：快速上升，然後緩慢下降
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    // 播放三個音調，每個音調稍微重疊
    frequencies.forEach((freq, index) => {
      playTone(freq, audioContext.currentTime + index * 0.1, 0.3);
    });
    
    // 清理音頻上下文（在音效播放完成後）
    setTimeout(() => {
      audioContext.close().catch(() => {
        // 忽略關閉錯誤
      });
    }, 1000);
  } catch (error) {
    // 如果音頻播放失敗，靜默處理（不影響主要功能）
    console.warn('音效播放失敗:', error);
  }
};

/**
 * 播放錯誤音效
 * 生成一個下降的音調，表示錯誤
 */
// @ARCH: soundService - FEAT: 播放錯誤音效
export const playWrongSound = (): void => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 從高頻降到低頻
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
    oscillator.type = 'sawtooth';
    
    // 音量包絡
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // 清理音頻上下文
    setTimeout(() => {
      audioContext.close().catch(() => {
        // 忽略關閉錯誤
      });
    }, 500);
  } catch (error) {
    console.warn('音效播放失敗:', error);
  }
};

/**
 * 檢查瀏覽器是否支援 Web Audio API
 */
// @ARCH: soundService - FEAT: 檢查 Web Audio API 支援
export const isWebAudioSupported = (): boolean => {
  return !!(window.AudioContext || (window as any).webkitAudioContext);
};

