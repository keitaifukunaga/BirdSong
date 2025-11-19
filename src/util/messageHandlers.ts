/**
 * メッセージハンドラー
 * 
 * Backgroundスクリプトで受信するメッセージを処理するハンドラー関数を定義します。
 * 各ハンドラーは状態管理オブジェクトを受け取り、状態を更新します。
 * 
 * @packageDocumentation
 * @module messageHandlers
 */
import type { Bird } from '../typeConst';
import { searchBirdAudio } from './api';
import { audioHistoryManager } from './audioHistory';
import { notifyPopup } from './popupNotifier';
import type { OffscreenAudioState } from './offscreenManager';

/**
 * 背景スクリプトの状態管理オブジェクト
 */
export interface BackgroundState {
  currentBird: Bird | null;
  isPlaying: boolean;
  isPaused: boolean;
  region: string;
  isWaiting: boolean;
  waitingTimeout: number | null;
  waitingStartTime: number | null;
}

/**
 * 完全な状態（BackgroundとOffscreenを統合した状態）
 */
export interface FullState {
  isPlaying: boolean;
  isPaused: boolean;
  isWaiting: boolean;
  waitingRemainingTime: number;
  currentBird: Bird | null;
  region: string;
  audioState: OffscreenAudioState;
}

/**
 * 状態更新関数の型
 */
export type StateUpdater = (updates: Partial<BackgroundState>) => void;

/**
 * 状態保存関数の型
 */
export type SaveStateFunction = () => Promise<void>;

/**
 * 鳥の音声を再生する関数の型
 */
export type PlayBirdAudioFunction = (bird: Bird) => Promise<void>;

/**
 * 次の鳥を再生する関数の型
 */
export type PlayNextFunction = () => Promise<void>;

/**
 * 次の鳥を待機後に再生する関数の型
 */
export type PlayNextWithWaitFunction = () => Promise<void>;

/**
 * 完全な状態を取得する関数の型
 */
export type GetFullStateFunction = () => Promise<FullState>;

/**
 * ハンドラー関数のコンテキスト
 */
export interface HandlerContext {
  state: BackgroundState;
  updateState: StateUpdater;
  saveState: SaveStateFunction;
  playBirdAudio: PlayBirdAudioFunction;
  playNext: PlayNextFunction;
  playNextWithWait: PlayNextWithWaitFunction;
  getFullState: GetFullStateFunction;
}

/**
 * メッセージハンドラーの型定義
 */
export type MessageHandler = (msg: any, context: HandlerContext) => Promise<any> | any;

/**
 * Offscreenイベントハンドラー
 */
export async function handleOffscreenEvent(msg: any, context: HandlerContext): Promise<any> {
  const { state, updateState, playNext, playNextWithWait } = context;
  
  console.log(`[Background] Offscreen event: ${msg.event} , isPlaying: ${state.isPlaying}, isPaused: ${state.isPaused}`);
  
  switch (msg.event) {
    case 'audioEnded':
      if (state.isPlaying && !state.isPaused) {
        playNextWithWait();
      }
      break;
    
    case 'audioError':
      if (state.isPlaying && !state.isPaused) {
        console.error('[Background] Audio error, trying next bird');
        playNext();
      }
      break;
    
    case 'audioStarted':
      updateState({
        isPlaying: true,
        isPaused: false
      });
      notifyPopup('audioStarted', state.currentBird);
      break;
    
    case 'audioPaused':
      updateState({
        isPaused: true
      });
      notifyPopup('audioPaused');
      break;
    
    case 'audioResumed':
      updateState({
        isPlaying: true,
        isPaused: false
      });
      notifyPopup('audioResumed');
      break;
  }
  
  return { success: true };
}

/**
 * 再生開始ハンドラー
 */
export async function handleStart(msg: any, context: HandlerContext): Promise<any> {
  const { state, updateState, saveState, playBirdAudio } = context;
  
  const region = msg.region || '';
  updateState({
    isPlaying: true,
    isPaused: false,
    region
  });
  
  const bird = await searchBirdAudio(region);
  
  if (bird) {
    updateState({ currentBird: bird });
    await playBirdAudio(bird);
    await saveState();
    notifyPopup('birdChanged', bird);
    return { success: true, bird };
  } else {
    return { success: false, error: 'No birds found' };
  }
}

/**
 * 停止ハンドラー
 */
export async function handleStop(msg: any, context: HandlerContext): Promise<any> {
  const { state, updateState, saveState } = context;
  
  updateState({
    isPlaying: false,
    isPaused: false,
    currentBird: null
  });
  
  // 待機中の場合、タイマーをキャンセル
  if (state.isWaiting && state.waitingTimeout) {
    clearTimeout(state.waitingTimeout);
    updateState({
      isWaiting: false,
      waitingTimeout: null,
      waitingStartTime: null
    });
    notifyPopup('waitingCancelled');
  }
  
  // Offscreenに停止を指示
  await chrome.runtime.sendMessage({
    type: 'stopAudio'
  }).catch(() => {});
  
  await saveState();
  return { success: true };
}

/**
 * 一時停止ハンドラー
 */
export async function handlePause(msg: any, context: HandlerContext): Promise<any> {
  const { updateState, saveState } = context;
  
  updateState({
    isPaused: true
  });
  
  // Offscreenに一時停止を指示
  await chrome.runtime.sendMessage({
    type: 'pauseAudio'
  }).catch(() => {});
  
  await saveState();
  return { success: true };
}

/**
 * 再開ハンドラー
 */
export async function handleResume(msg: any, context: HandlerContext): Promise<any> {
  const { updateState, saveState } = context;
  
  updateState({
    isPaused: false
  });
  
  // Offscreenに再開を指示
  await chrome.runtime.sendMessage({
    type: 'resumeAudio'
  }).catch(() => {});
  
  await saveState();
  return { success: true };
}

/**
 * 次の鳥を再生ハンドラー
 */
export async function handleNext(msg: any, context: HandlerContext): Promise<any> {
  const { state, playNext } = context;
  
  await playNext();
  return { success: true, bird: state.currentBird };
}

/**
 * 状態取得ハンドラー
 */
export async function handleGetState(msg: any, context: HandlerContext): Promise<any> {
  const { getFullState } = context;
  const fullState = await getFullState();
  return fullState;
}

/**
 * 音声履歴ダウンロードハンドラー
 */
export async function handleDownloadAudioHistory(msg: any, context: HandlerContext): Promise<any> {
  try {
    const downloadedCount = await audioHistoryManager.downloadHistory();
    return { success: true, count: downloadedCount };
  } catch (error) {
    console.error('[Background] Download error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 音声履歴件数取得ハンドラー
 */
export function handleGetAudioHistoryCount(msg: any, context: HandlerContext): any {
  const count = audioHistoryManager.getHistoryCount();
  console.log(`[Background] getAudioHistoryCount requested. Current count: ${count}`);
  return { count };
}

