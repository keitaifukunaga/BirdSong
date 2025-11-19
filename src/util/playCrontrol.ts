/**
 * 再生制御関数
 * 
 * 鳥のさえずり音声の再生を制御する関数を定義します。
 * 
 * @packageDocumentation
 * @module playControl
 */
import type { Bird } from '../typeConst';
import { WAIT_NEXT_BIRD_TIME } from '../typeConst';
import { searchBirdAudio } from './api';
import { audioHistoryManager } from './audioHistory';
import { notifyPopup } from './popupNotifier';
import { offscreenManager } from './offscreenManager';
import type { BackgroundState, StateUpdater } from './messageHandlers';

/**
 * 指定した鳥の音声 URL を Offscreen に渡して再生を開始します。
 *
 * @param bird 再生対象の `Bird`
 */
export async function playBirdAudio(bird: Bird): Promise<void> {
  await offscreenManager.setupOffscreen();
  
  // 🎵 音声URLを履歴に追加
  audioHistoryManager.addToHistory(bird);
  
  await chrome.runtime.sendMessage({
    type: 'playAudio',
    audioUrl: bird.audioUrl,
    birdInfo: bird
  });
}

/**
 * 60秒待機してから次の鳥を再生します。
 * 待機中はポップアップに状態を通知します。
 *
 * @param state 現在の状態
 * @param updateState 状態更新関数
 */
export async function playNextWithWait(
  state: BackgroundState,
  updateState: StateUpdater
): Promise<void> {
  if (state.isWaiting) {
    console.log('[Background] Already waiting, skipping...');
    return;
  }

  updateState({
    isWaiting: true,
    waitingStartTime: Date.now()
  });
  notifyPopup('waitingStarted');

  console.log('[Background] Starting 60-second wait before next bird...');
  
  // @ts-ignore
  const timeoutId = setTimeout(async () => {
    console.log('[Background] Wait completed, playing next bird...');
    updateState({
      isWaiting: false,
      waitingTimeout: null,
      waitingStartTime: null
    });
    
    const bird = await searchBirdAudio(state.region);
    if (bird) {
      updateState({ currentBird: bird });
      await playBirdAudio(bird);
      await saveState(state);
      notifyPopup('birdChanged', bird);
    }
  }, WAIT_NEXT_BIRD_TIME); // 60秒
  
  updateState({ waitingTimeout: timeoutId as unknown as number });
}

/**
 * 次の鳥（検索結果からランダム）を取得して再生します。
 * 状態を保存し、ポップアップに `birdChanged` を通知します。
 *
 * @param state 現在の状態
 * @param updateState 状態更新関数
 */
export async function playNext(
  state: BackgroundState,
  updateState: StateUpdater
): Promise<void> {
  const bird = await searchBirdAudio(state.region);
  if (bird) {
    updateState({ currentBird: bird });
    await playBirdAudio(bird);
    await saveState(state);
    notifyPopup('birdChanged', bird);
  }
}

/**
 * 現在の再生状態を `chrome.storage.local` に保存します。
 *
 * @param state 現在の状態
 */
export async function saveState(state: BackgroundState): Promise<void> {
  await chrome.storage.local.set({
    playbackState: {
      isPlaying: state.isPlaying,
      isPaused: state.isPaused,
      currentBird: state.currentBird,
      region: state.region
    }
  });
}

