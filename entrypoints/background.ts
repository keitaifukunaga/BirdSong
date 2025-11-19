/**
 * BirdSong 拡張のバックグラウンドスクリプト
 *
 * 本スクリプトは、鳥のさえずり音声の再生管理を担います。音声再生用の
 * Offscreen ドキュメントを作成・維持し、再生状態(再生中/一時停止中/対象の鳥/地域)
 * を管理します。また、Offscreen ドキュメントおよびポップアップからのメッセージを
 * 受け取り、再生の開始・停止・一時停止・再開・次トラックへの移行などの操作を
 * 仲介します。
 *
 * @packageDocumentation
 * @module background
 */
import { WAIT_NEXT_BIRD_TIME } from '../src/typeConst';
import { getOptions, shouldResumePlayback, type StartupReason } from '../src/util/optionsManager';
import { offscreenManager } from '../src/util/offscreenManager';
import {
  handleOffscreenEvent,
  handleStart,
  handleStop,
  handlePause,
  handleResume,
  handleNext,
  handleGetState,
  handleDownloadAudioHistory,
  handleGetAudioHistoryCount,
  type BackgroundState,
  type FullState,
  type HandlerContext,
  type MessageHandler
} from '../src/util/messageHandlers';
import {
  playBirdAudio,
  playNextWithWait,
  playNext,
  saveState
} from '../src/util/playCrontrol';

export default defineBackground(() => {
  console.log('[Background] BirdSong started');

  // 状態管理オブジェクト
  const state: BackgroundState = {
    currentBird: null,
    isPlaying: false,
    isPaused: false,
    region: '',
    isWaiting: false,
    waitingTimeout: null,
    waitingStartTime: null
  };
  
  let startupReason: StartupReason = 'unknown';
  
  // 状態更新関数
  function updateState(updates: Partial<BackgroundState>): void {
    Object.assign(state, updates);
  }


  /**
   * バックグラウンドと Offscreen を統合した完全な状態を返します。
   * Offscreen の実状態が取得できた場合はそちらを優先して合成します。
   */
  async function getFullState(): Promise<FullState> {
    const offscreenState = await offscreenManager.getOffscreenState();
    
    // 待機中の残り時間を計算
    let remainingTime = 0;
    if (state.isWaiting && state.waitingStartTime) {
      const elapsed = Date.now() - state.waitingStartTime;
      remainingTime = Math.max(0, WAIT_NEXT_BIRD_TIME - elapsed);
    }
    
    return {
      // Offscreen の実状態を優先
      isPlaying: (offscreenState && typeof offscreenState.isPlaying === 'boolean') ? (offscreenState.isPlaying || state.isPlaying) : state.isPlaying,
      isPaused: (offscreenState && typeof offscreenState.isPaused === 'boolean') ? (offscreenState.isPaused || state.isPaused) : state.isPaused,
      isWaiting: state.isWaiting,
      waitingRemainingTime: remainingTime,
      currentBird: state.currentBird,
      region: state.region,
      audioState: offscreenState
    };
  }


  /**
   * ハンドラーコンテキストを作成
   */
  function createHandlerContext(): HandlerContext {
    return {
      state,
      updateState,
      saveState: () => saveState(state),
      playBirdAudio,
      playNext: () => playNext(state, updateState),
      playNextWithWait: () => playNextWithWait(state, updateState),
      getFullState
    };
  }

  /**
   * メッセージハンドラーマップ
   */
  const messageHandlers: Record<string, MessageHandler> = {
    offscreenEvent: handleOffscreenEvent,
    start: handleStart,
    stop: handleStop,
    pause: handlePause,
    resume: handleResume,
    next: handleNext,
    getState: handleGetState,
    getFullState: handleGetState, // 同じハンドラーを使用
    downloadAudioHistory: handleDownloadAudioHistory,
    getAudioHistoryCount: handleGetAudioHistoryCount,
  };

  /**
   * メッセージ受信リスナー。
   * - Offscreen からのイベント（再生終了/エラー/開始/一時停止/再開）を処理
   * - ポップアップからのコマンド（start/stop/pause/resume/next/getState 等）を処理
   */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[Background] Message:', msg.type);
    
    const handler = messageHandlers[msg.type];
    if (!handler) {
      console.warn(`[Background] Unknown message type: ${msg.type}`);
      sendResponse({ success: false, error: `Unknown message type: ${msg.type}` });
      return false;
    }
    
    const context = createHandlerContext();
    
    Promise.resolve(handler(msg, context))
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error('[Background] Message handling error:', error);
        sendResponse({ success: false, error: String(error) });
      });
    
    return true; // 非同期レスポンスを示す
  });

  /**
   * viewウィンドウフラグをクリアする共通処理
   */
  async function clearViewWindowFlag(context: string): Promise<void> {
    try {
      await chrome.storage.local.remove(['viewWindowOpen']);
      console.log(`[Background] Cleared viewWindowOpen flag on ${context}`);
    } catch (error) {
      console.error(`[Background] Failed to clear viewWindowOpen flag on ${context}:`, error);
    }
  }

  // 初期化処理を実行する共通関数
  async function initializePlayback(): Promise<void> {
    const data = await chrome.storage.local.get(['playbackState']);
    if (data.playbackState) {
      updateState({
        isPlaying: data.playbackState.isPlaying,
        isPaused: data.playbackState.isPaused,
        currentBird: data.playbackState.currentBird,
        region: data.playbackState.region
      });
      
      console.log('[Background] Restored state:', {
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        currentBird: state.currentBird?.commonName,
        region: state.region,
        startupReason
      });
      
      // 再生中だった場合は再開
      if (state.isPlaying && state.currentBird) {
        await offscreenManager.setupOffscreen();
        
        // Offscreenの実際の状態を確認
        const offscreenState = await offscreenManager.getOffscreenState();
        console.log('[Background] Offscreen actual state:', offscreenState);
        
        // Offscreenが再生していない場合のみ再開
        if (!offscreenState.isPlaying && !state.isPaused) {
          // オプション設定を確認
          const options = await getOptions();
          const shouldResume = shouldResumePlayback(options, startupReason);
          
          if (shouldResume) {
            console.log('[Background] Resuming playback...');
            await playBirdAudio(state.currentBird!);
          } else {
            console.log('[Background] Auto-resume disabled, not resuming playback');
            // オプションで無効化されている場合は再生状態を停止に変更
            updateState({
              isPlaying: false,
              isPaused: false,
              currentBird: null
            });
            await saveState(state);
          }
        } else {
          console.log('[Background] Offscreen already playing, syncing state...');
        }
      }
    }
  }

  // 拡張機能の初回インストール/更新時にフラグをクリア
  chrome.runtime.onInstalled.addListener(async () => {
    startupReason = 'installed';
    clearViewWindowFlag('installation/update');
    await initializePlayback();
  });

  // ブラウザ起動時にフラグをクリア
  chrome.runtime.onStartup.addListener(async () => {
    startupReason = 'startup';
    clearViewWindowFlag('browser startup');
    await initializePlayback();
  });

});
