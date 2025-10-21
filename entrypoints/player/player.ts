export default defineUnlistedScript(() => {
  console.log('[Player] Audio player initialized');

  let audioElement: HTMLAudioElement | null = null;
  let currentBirdInfo: any = null;

  const statusEl = document.getElementById('status');
  const birdInfoEl = document.getElementById('bird-info');
  const birdNameEl = document.getElementById('bird-name');
  const scientificNameEl = document.getElementById('scientific-name');

  function updateStatus(message: string) {
    if (statusEl) {
      statusEl.textContent = message;
    }
    console.log('[Player]', message);
  }

  function updateBirdInfo(birdInfo: any) {
    if (birdInfo && birdNameEl && scientificNameEl && birdInfoEl) {
      birdNameEl.textContent = birdInfo.commonName || 'Unknown Bird';
      scientificNameEl.textContent = birdInfo.scientificName || '';
      birdInfoEl.style.display = 'block';
    }
  }

  // メッセージハンドラー
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Player] Received message:', message.type);

    switch (message.type) {
      case 'playAudio':
        playAudio(message.audioUrl, message.birdInfo);
        sendResponse({ success: true });
        break;

      case 'pauseAudio':
        pauseAudio();
        sendResponse({ success: true });
        break;

      case 'resumeAudio':
        resumeAudio();
        sendResponse({ success: true });
        break;

      case 'stopAudio':
        stopAudio();
        sendResponse({ success: true });
        break;

      case 'getAudioState':
        sendResponse({
          isPlaying: audioElement && !audioElement.paused,
          isPaused: audioElement && audioElement.paused && audioElement.currentTime > 0,
          currentTime: audioElement?.currentTime || 0,
          duration: audioElement?.duration || 0
        });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true;
  });

  function playAudio(audioUrl: string, birdInfo: any) {
    console.log('[Player] Playing audio:', audioUrl);
    console.log('[Player] Bird info:', birdInfo);

    currentBirdInfo = birdInfo;
    updateStatus('🎵 Playing: ' + (birdInfo?.commonName || 'Unknown'));
    updateBirdInfo(birdInfo);

    // 既存の音声を停止
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }

    // 新しい音声要素を作成
    audioElement = new Audio(audioUrl);
    audioElement.volume = 0.5; // 50% volume

    // イベントリスナーを設定
    audioElement.onloadeddata = () => {
      console.log('[Player] Audio loaded, duration:', audioElement?.duration);
      updateStatus('🎵 Playing: ' + (birdInfo?.commonName || 'Unknown'));
    };

    audioElement.onplay = () => {
      console.log('[Player] Audio started playing');
      notifyBackground('audioStarted');
    };

    audioElement.onended = () => {
      console.log('[Player] Audio ended');
      updateStatus('⏭️ Loading next bird...');
      notifyBackground('audioEnded');
    };

    audioElement.onerror = (e) => {
      console.error('[Player] Audio error:', e);
      console.error('[Player] Error details:', {
        error: audioElement?.error,
        networkState: audioElement?.networkState,
        readyState: audioElement?.readyState
      });
      updateStatus('❌ Audio error, trying next...');
      notifyBackground('audioError', { error: 'Playback error' });
    };

    audioElement.onpause = () => {
      console.log('[Player] Audio paused');
      updateStatus('⏸️ Paused: ' + (birdInfo?.commonName || 'Unknown'));
      notifyBackground('audioPaused');
    };

    // 音声を再生
    audioElement.play()
      .then(() => {
        console.log('[Player] Play promise resolved');
      })
      .catch((error) => {
        console.error('[Player] Play promise rejected:', error);
        updateStatus('❌ Failed to play audio');
        notifyBackground('audioError', { error: error.message });
      });
  }

  function pauseAudio() {
    if (audioElement && !audioElement.paused) {
      console.log('[Player] Pausing audio');
      audioElement.pause();
      updateStatus('⏸️ Paused');
    } else {
      console.log('[Player] No audio to pause or already paused');
    }
  }

  function resumeAudio() {
    if (audioElement && audioElement.paused) {
      console.log('[Player] Resuming audio');
      audioElement.play()
        .then(() => {
          console.log('[Player] Resume successful');
          updateStatus('🎵 Playing: ' + (currentBirdInfo?.commonName || 'Unknown'));
        })
        .catch((error) => {
          console.error('[Player] Resume error:', error);
          updateStatus('❌ Resume failed');
        });
    } else {
      console.log('[Player] No audio to resume or already playing');
    }
  }

  function stopAudio() {
    if (audioElement) {
      console.log('[Player] Stopping audio');
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement = null;
      currentBirdInfo = null;
      updateStatus('⏹️ Stopped');
      if (birdInfoEl) {
        birdInfoEl.style.display = 'none';
      }
    }
  }

  function notifyBackground(event: string, data?: any) {
    chrome.runtime.sendMessage({
      type: 'playerEvent',
      event,
      data
    }).catch((error) => {
      console.log('[Player] Failed to notify background:', error.message);
    });
  }

  updateStatus('✅ Ready to play');
});
