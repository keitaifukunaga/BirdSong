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
let currentBlobUrl: string | null = null;

// Web Audio API のコンポーネント
let audioContext: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let gainNode: GainNode | null = null;

/**
 * 外部URLから音声データをダウンロードしてBlobとして取得します。
 * Chrome拡張機能のコンテキストからのfetchはCORS制限を受けません。
 */
async function downloadAudioAsBlob(url: string): Promise<Blob> {
  console.log('[Offscreen] Downloading audio from:', url);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  console.log('[Offscreen] Audio downloaded, size:', blob.size, 'bytes');
  return blob;
}

/**
 * Web Audio API のセットアップを行います。
 * DynamicsCompressorNode を使用して音量を正規化し、
 * GainNode でユーザー設定の音量を適用します。
 */
function setupAudioContext(audio: HTMLAudioElement) {
  // AudioContextを初回のみ作成
  if (!audioContext) {
    audioContext = new AudioContext();
    
    // コンプレッサーノードを作成（音量を均一化）
    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.setValueAtTime(-24, audioContext.currentTime); // dB
    compressorNode.knee.setValueAtTime(30, audioContext.currentTime);
    compressorNode.ratio.setValueAtTime(12, audioContext.currentTime);
    compressorNode.attack.setValueAtTime(0.003, audioContext.currentTime); // 秒
    compressorNode.release.setValueAtTime(0.25, audioContext.currentTime); // 秒

    // ゲインノードを作成（ユーザー設定の音量調整用）
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // デフォルト音量

    // コンプレッサーとゲインを接続
    compressorNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    console.log('[Offscreen] Web Audio API initialized');
  }

  // 既存のsourceNodeをクリーンアップ
  if (sourceNode) {
    try {
      sourceNode.disconnect();
      console.log('[Offscreen] Previous source disconnected');
    } catch (e) {
      // 既に切断されている場合は無視
    }
  }

  // 新しいaudioElementに対して新しいMediaElementSourceを作成
  sourceNode = audioContext.createMediaElementSource(audio);
  
  // sourceをコンプレッサーに接続
  sourceNode.connect(compressorNode!);

  console.log('[Offscreen] Audio source connected to Web Audio API');
}

/**
 * 音量を設定します（0.0 〜 1.0）
 */
function setVolume(volume: number) {
  if (gainNode && audioContext) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    gainNode.gain.setValueAtTime(clampedVolume, audioContext.currentTime);
    console.log('[Offscreen] Volume set to:', clampedVolume);
  }
}

// メッセージハンドラー
/**
 * chrome.runtime メッセージの受信口。
 *
 * 受理するメッセージ:
 * - `playAudio` { audioUrl: string, birdInfo: any }
 * - `pauseAudio`
 * - `resumeAudio`
 * - `stopAudio`
 * - `setVolume` { volume: number } - 音量設定（0.0 〜 1.0）
 * - `getAudioState` → { isPlaying: boolean, isPaused: boolean, currentTime: number, duration: number }
 *
 * 未対応メッセージは `false` を返し、他のリスナーに委譲します。
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type);

  switch (message.type) {
    // 再生開始（非同期処理なのでasync/awaitを使用）
    case 'playAudio':
      playAudio(message.audioUrl, message.birdInfo)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[Offscreen] Play audio failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 非同期レスポンスを示す

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

    // 音量設定
    case 'setVolume':
      setVolume(message.volume);
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
      return false;
  }

  return false;
});

/**
 * 指定 URL の音声を新規にロードして再生します。
 * 音声データを一度ダウンロードしてBlobとして保存することで、
 * CORS制限を回避してWeb Audio APIを使用できます。
 *
 * @param audioUrl 再生する音声ファイルの URL
 * @param birdInfo 音源に紐づく付帯情報（UI 表示等に利用）
 */
async function playAudio(audioUrl: string, birdInfo: any) {
  console.log('[Offscreen] Playing audio:', audioUrl);
  console.log('[Offscreen] Bird info:', birdInfo);

  currentBirdInfo = birdInfo;

  // 既存の音声を停止
  if (audioElement) {
    audioElement.pause();
    audioElement = null;
  }

  // 既存のBlobURLをクリーンアップ
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  try {
    // 音声データをダウンロード
    const audioBlob = await downloadAudioAsBlob(audioUrl);
    
    // BlobからローカルURLを作成
    currentBlobUrl = URL.createObjectURL(audioBlob);
    console.log('[Offscreen] Created blob URL:', currentBlobUrl);

    // 新しい音声要素を作成（ローカルBlobURLを使用）
    audioElement = new Audio(currentBlobUrl);
    
    // Web Audio API のセットアップ（音量正規化）
    setupAudioContext(audioElement);

    // イベントリスナーを設定
    audioElement.onloadeddata = () => {
      console.log('[Offscreen] Audio loaded, duration:', audioElement?.duration);
    };

    audioElement.onplay = () => {
      console.log('[Offscreen] Audio started playing');
      notifyBackground('audioStarted');
    };

    audioElement.onended = () => {
      console.log('[Offscreen] Audio ended');
      notifyBackground('audioEnded');
    };

    audioElement.onerror = (e) => {
      console.error('[Offscreen] Audio error:', e);
      console.error('[Offscreen] Error details:', {
        error: audioElement?.error,
        networkState: audioElement?.networkState,
        readyState: audioElement?.readyState
      });
      notifyBackground('audioError', { error: 'Playback error' });
    };

    // 音声を再生
    await audioElement.play();
    console.log('[Offscreen] Play started successfully');
    
  } catch (error) {
    console.error('[Offscreen] Failed to play audio:', error);
    notifyBackground('audioError', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * 再生中の音声を一時停止します。
 * 再生中でない場合は何もしません。
 */
function pauseAudio() {
  if (audioElement && !audioElement.paused) {
    console.log('[Offscreen] Pausing audio');
    audioElement.pause();
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
  
  // BlobURLをクリーンアップ
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
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
