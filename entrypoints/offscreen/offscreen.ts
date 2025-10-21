/**
 * @file Offscreen audio player for the extension.
 * @description
 *   Offscreen ドキュメントで実行される軽量なオーディオプレイヤー実装です。
 *   `chrome.runtime` のメッセージを受信して音声の再生/一時停止/再開/停止を制御し、
 *   再生状態の変化は background にイベント (`offscreenEvent`) で通知します。
 *   UI を持たないため、Popup/Background と非同期メッセージで状態同期します。
 */

console.log('[Offscreen] Audio player initialized');

let audioElement: HTMLAudioElement | null = null;
let currentBirdInfo: any = null;

// メッセージハンドラー
/**
 * chrome.runtime メッセージの受信口。
 *
 * 受理するメッセージ:
 * - `playAudio` { audioUrl: string, birdInfo: any }
 * - `pauseAudio`
 * - `resumeAudio`
 * - `stopAudio`
 * - `getAudioState` → { isPlaying: boolean, isPaused: boolean, currentTime: number, duration: number }
 *
 * 未対応メッセージは `false` を返し、他のリスナーに委譲します。
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type);

  switch (message.type) {
    // 再生開始
    case 'playAudio':
      playAudio(message.audioUrl, message.birdInfo);
      sendResponse({ success: true });
      break;

    // 一時停止
    case 'pauseAudio':
      pauseAudio();
      sendResponse({ success: true });
      break;

    // 再開
    case 'resumeAudio':
      resumeAudio();
      sendResponse({ success: true });
      break;

    // 停止
    case 'stopAudio':
      stopAudio();
      sendResponse({ success: true });
      break;

    // 状態取得
    case 'getAudioState':
      const state = {
        isPlaying: audioElement && !audioElement.paused,
        isPaused: audioElement && audioElement.paused && audioElement.currentTime > 0,
        currentTime: audioElement?.currentTime || 0,
        duration: audioElement?.duration || 0
      };
      console.log('[Offscreen] Returning state:', state);
      sendResponse(state);
      break;

    default:
      // 未対応メッセージは無視し、background 側のリスナーに処理を委ねる
      // ここで sendResponse を返さないことで、popup からの `getFullState` などが
      // background 側で正しく処理されるようにする
      return false;
  }

  // 同期的に sendResponse 済みなので true は不要
  return false;
});

/**
 * 指定 URL の音声を新規にロードして再生します。
 * 既存の再生中メディアがあれば停止してから差し替えます。
 * 再生状態の変化は `notifyBackground` で background に通知します。
 *
 * @param audioUrl 再生する音声ファイルの URL
 * @param birdInfo 音源に紐づく付帯情報（UI 表示等に利用）
 */
function playAudio(audioUrl: string, birdInfo: any) {
  console.log('[Offscreen] Playing audio:', audioUrl);
  console.log('[Offscreen] Bird info:', birdInfo);

  currentBirdInfo = birdInfo;

  // 既存の音声を停止
  if (audioElement) {
    audioElement.pause();
    audioElement = null;
  }

  // 新しい音声要素を作成
  audioElement = new Audio(audioUrl);
  audioElement.volume = 0.5;

  // イベントリスナーを設定
  // 音声データが読み込まれた
  audioElement.onloadeddata = () => {
    console.log('[Offscreen] Audio loaded, duration:', audioElement?.duration);
  };

  // 音声が再生された
  audioElement.onplay = () => {
    console.log('[Offscreen] Audio started playing');
    notifyBackground('audioStarted');
  };

  // 音声が終了した
  audioElement.onended = () => {
    console.log('[Offscreen] Audio ended');
    notifyBackground('audioEnded');
  };

  // 音声エラーが発生した
  audioElement.onerror = (e) => {
    console.error('[Offscreen] Audio error:', e);
    console.error('[Offscreen] Error details:', {
      error: audioElement?.error,
      networkState: audioElement?.networkState,
      readyState: audioElement?.readyState
    });
    notifyBackground('audioError', { error: 'Playback error' });
  };

  // 音声が一時停止された
  // audioElement.onpause = () => {
  //   console.log('[Offscreen] Audio paused');
  //   notifyBackground('audioPaused');
  // };

  // 音声を再生
  audioElement.play()
    .then(() => {
      console.log('[Offscreen] Play promise resolved');
    })
    .catch((error) => {
      console.error('[Offscreen] Play promise rejected:', error);
      notifyBackground('audioError', { error: error.message });
    });
}

/**
 * 再生中の音声を一時停止します。
 * 再生中でない場合は何もしません。
 */
function pauseAudio() {
  if (audioElement && !audioElement.paused) {
    console.log('[Offscreen] Pausing audio');
    audioElement.pause();
    // ユーザー/明示的な一時停止のみここで通知
    notifyBackground('audioPaused');
  } else {
    console.log('[Offscreen] No audio to pause or already paused');
  }
}

/**
 * 一時停止中の音声を再開します。
 * 成功時は `audioResumed` を background に通知します。
 */
function resumeAudio() {
  if (audioElement && audioElement.paused) {
    console.log('[Offscreen] Resuming audio');
    audioElement.play()
      .then(() => {
        console.log('[Offscreen] Resume successful');
        // 🔥 再開イベントを通知
        notifyBackground('audioResumed');
      })
      .catch((error) => {
        console.error('[Offscreen] Resume error:', error);
      });
  } else {
    console.log('[Offscreen] No audio to resume or already playing');
  }
}

/**
 * 再生中（またはロード済み）の音声を停止し、状態を初期化します。
 * 再生位置は 0 に戻し、参照を破棄します。
 */
function stopAudio() {
  if (audioElement) {
    console.log('[Offscreen] Stopping audio');
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement = null;
    currentBirdInfo = null;
  }
}

/**
 * background へオフスクリーン側のイベントを通知します。
 *
 * @param event 送信するイベント名（例: `audioStarted`, `audioPaused` など）
 * @param data 付帯データ（任意）
 */
function notifyBackground(event: string, data?: any) {
  chrome.runtime.sendMessage({
    type: 'offscreenEvent',
    event,
    data
  }).catch((error) => {
    console.log('[Offscreen] Failed to notify background:', error.message);
  });
}
