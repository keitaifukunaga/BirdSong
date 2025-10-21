/**
 * BirdSong 拡張のバックグラウンドスクリプト
 *
 * 本スクリプトは、鳥のさえずり音声の再生管理を担います。音声再生用の
 * Offscreen ドキュメントを作成・維持し、再生状態（再生中/一時停止中/対象の鳥/地域）
 * を管理します。また、Offscreen ドキュメントおよびポップアップからのメッセージを
 * 受け取り、再生の開始・停止・一時停止・再開・次トラックへの移行などの操作を
 * 仲介します。
 *
 * @packageDocumentation
 * @module background
 */
import type { Bird } from '../src/typeConst';

// @ts-ignore
export default defineBackground(() => {
  console.log('[Background] BirdSong started');

  let currentBird: Bird | null = null;
  let isPlaying = false;
  let isPaused = false;
  let region = '';
  let offscreenCreated = false;

  /**
   * Offscreen ドキュメントのセットアップを行います。
   * 既存コンテキストを確認し、未作成の場合は作成します。
   *
   * 副作用:
   * - `offscreenCreated` を現在の状態に同期します。
   *
   * 失敗時:
   * - 作成に失敗した場合はエラーを投げます。
   */
  async function setupOffscreen() {
    try {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT' as any],
      });

      if (existingContexts.length > 0) {
        offscreenCreated = true;
        return;
      }

      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('/offscreen.html'),
        reasons: ['AUDIO_PLAYBACK' as any],
        justification: 'Playing continuous bird songs'
      });
      offscreenCreated = true;
      console.log('[Background] Offscreen document created');
    } catch (error) {
      offscreenCreated = false;
      console.error('[Background] Failed to create offscreen:', error);
      throw error;
    }
  }

  /**
   * Offscreen 側の音声状態を取得します。
   * 必要に応じて Offscreen を作成し、取得に失敗した場合は 1 回だけ再作成後に再試行します。
   *
   * 戻り値の例:
   * `{ isPlaying: boolean, isPaused: boolean, currentTime: number, duration: number }`
   */
  async function getOffscreenState() {
    try {
      await setupOffscreen();
      // offscreen.ts から getAudioState メッセージを受信
      const response = await chrome.runtime.sendMessage({ type: 'getAudioState' });
      console.log('[Background] Offscreen state:', response);
      return response;
    } catch (error) {
      console.warn('[Background] getAudioState failed, retrying after recreating offscreen:', error);
      try {
        // 再作成してワンリトライ
        offscreenCreated = false;
        await setupOffscreen();
        // offscreen.ts から getAudioState メッセージを受信
        const retryResponse = await chrome.runtime.sendMessage({ type: 'getAudioState' });
        console.log('[Background] Offscreen state (after retry):', retryResponse);
        return retryResponse;
      } catch (retryError) {
        console.error('[Background] Failed to get offscreen state after retry:', retryError);
        return {
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          duration: 0
        };
      }
    }
  }

  /**
   * バックグラウンドと Offscreen を統合した完全な状態を返します。
   * Offscreen の実状態が取得できた場合はそちらを優先して合成します。
   */
  async function getFullState() {
    const offscreenState = await getOffscreenState();
    
    return {
      // Offscreen の実状態を優先
      isPlaying: (offscreenState && typeof offscreenState.isPlaying === 'boolean') ? (offscreenState.isPlaying || isPlaying) : isPlaying,
      isPaused: (offscreenState && typeof offscreenState.isPaused === 'boolean') ? (offscreenState.isPaused || isPaused) : isPaused,
      currentBird,
      region,
      audioState: offscreenState
    };
  }

  /**
   * 鳥の音声を検索し、ランダムに 1 件の `Bird` を返します。
   *
   * @param regionCode 検索対象の地域コード（未指定時は全地域）
   * @returns 見つかった `Bird` オブジェクト、または見つからない場合は `null`
   */
  async function searchBirdAudio(regionCode?: string): Promise<Bird | null> {
    console.log('[Background] Searching birds, region:', regionCode || 'all');
    
    const params = new URLSearchParams({
      mediaType: 'audio',
      count: '20',
      sort: 'rating_rank_desc'
    });

    if (regionCode) {
      params.append('regionCode', regionCode);
    }

    // API call to Macaulay Library
    // https://search.macaulaylibrary.org/api/v1/search?mediaType=audio&count=20&sort=rating_rank_desc
    const response = await fetch(`https://search.macaulaylibrary.org/api/v1/search?${params}`);
    const data = await response.json();

    if (!data.results?.content?.length) {
      console.log('[Background] No results found');
      return null;
    }

    const items = data.results.content;
    const randomIndex = Math.floor(Math.random() * items.length);
    const bird = items[randomIndex];

    console.log('[Background] Found bird:', bird.commonName);

    return {
      commonName: bird.commonName || 'Unknown',
      scientificName: bird.scientificName || '',
      audioUrl: bird.mediaUrl,
      imageUrl: bird.previewUrl,
      recordist: bird.userDisplayName,
      location: bird.locationName,
      observedDate: bird.observedDate
    };
  }

  /**
   * 指定した鳥の音声 URL を Offscreen に渡して再生を開始します。
   *
   * @param bird 再生対象の `Bird`
   */
  async function playBirdAudio(bird: Bird) {
    await setupOffscreen();
    
    await chrome.runtime.sendMessage({
      type: 'playAudio',
      audioUrl: bird.audioUrl,
      birdInfo: bird
    });
  }

  /**
   * 次の鳥（検索結果からランダム）を取得して再生します。
   * 状態を保存し、ポップアップに `birdChanged` を通知します。
   */
  async function playNext() {
    const bird = await searchBirdAudio(region);
    if (bird) {
      currentBird = bird;
      await playBirdAudio(bird);
      await saveState();
      notifyPopup('birdChanged', bird);
    }
  }

  /**
   * 現在の再生状態を `chrome.storage.local` に保存します。
   */
  async function saveState() {
    await chrome.storage.local.set({
      playbackState: {
        isPlaying,
        isPaused,
        currentBird,
        region
      }
    });
  }

  /**
   * ポップアップへイベント通知を送信します。ポップアップが閉じている場合は無視します。
   *
   * @param event イベント名
   * @param data 任意のペイロード
   */
  function notifyPopup(event: string, data?: any) {
    chrome.runtime.sendMessage({
      type: 'popupEvent',
      event,
      data
    }).catch(() => {
      // ポップアップが閉じている場合は無視
    });
  }

  /**
   * メッセージ受信リスナー。
   * - Offscreen からのイベント（再生終了/エラー/開始/一時停止/再開）を処理
   * - ポップアップからのコマンド（start/stop/pause/resume/next/getState 等）を処理
   */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[Background] Message:', msg.type);

    // Offscreenからのイベント
    if (msg.type === 'offscreenEvent') {
      console.log(`[Background] Offscreen event: ${msg.event} , isPlaying: ${isPlaying}, isPaused: ${isPaused}`);
      
      // 再生終了時は次の曲を再生
      if (msg.event === 'audioEnded' && isPlaying && !isPaused) {
        // 自動的に次の曲を再生
        playNext();
      // エラー時は次の曲を再生
      } else if (msg.event === 'audioError' && isPlaying && !isPaused) {
        // エラー時も次の曲を試す
        console.error('[Background] Audio error, trying next bird');
        playNext();
      // 再生開始時は isPlaying を true にし、isPaused を false に
      } else if (msg.event === 'audioStarted') {
        // 再生開始時は isPlaying を true にし、isPaused を false に
        isPlaying = true;
        isPaused = false;
        notifyPopup('audioStarted', currentBird);
      // 一時停止時は isPaused を true に
      } else if (msg.event === 'audioPaused') {
        isPaused = true;
        notifyPopup('audioPaused');
      // 再開時は isPlaying を true にし、isPaused を false に
      } else if (msg.event === 'audioResumed') {
        // 再開時も isPlaying は維持/true、isPaused は false
        isPlaying = true;
        isPaused = false;
        notifyPopup('audioResumed');
      }
      
      sendResponse({ success: true });
      return true;
    }

    // ポップアップからのコマンド
    (async () => {
      // 再生開始時は isPlaying を true にし、isPaused を false に
      if (msg.type === 'start') {
        isPlaying = true;
        isPaused = false;
        region = msg.region || '';
        const bird = await searchBirdAudio(region);
        if (bird) {
          currentBird = bird;
          await playBirdAudio(bird);
          await saveState();
          sendResponse({ success: true, bird });
        } else {
          sendResponse({ success: false, error: 'No birds found' });
        }
      }
      // 停止時は isPlaying を false にし、isPaused を false に
      else if (msg.type === 'stop') {
        isPlaying = false;
        isPaused = false;
        currentBird = null;
        
        // Offscreenに停止を指示
        await chrome.runtime.sendMessage({
          type: 'stopAudio'
        }).catch(() => {});
        
        await saveState();
        sendResponse({ success: true });
      }
      // 一時停止時は isPaused を true に
      else if (msg.type === 'pause') {
        isPaused = true;
        
        // Offscreenに一時停止を指示
        await chrome.runtime.sendMessage({
          type: 'pauseAudio'
        }).catch(() => {});
        
        await saveState();
        sendResponse({ success: true });
      }
      // 再開時は isPaused を false に
      else if (msg.type === 'resume') {
        isPaused = false;
        
        // Offscreenに再開を指示
        await chrome.runtime.sendMessage({
          type: 'resumeAudio'
        }).catch(() => {});
        
        await saveState();
        sendResponse({ success: true });
      }
      // 次の鳥を再生
      else if (msg.type === 'next') {
        await playNext();
        sendResponse({ success: true, bird: currentBird });
      }
      // 状態を取得
      else if (msg.type === 'getState') {
        // 🔥 完全な状態を返す（Offscreenの状態も含む）
        const fullState = await getFullState();
        sendResponse(fullState);
      }
      // 完全な状態を取得
      else if (msg.type === 'getFullState') {
        // 🔥 別名でも同じ機能
        const fullState = await getFullState();
        sendResponse(fullState);
      }
    })();

    return true;
  });

  // 初期化時に状態を復元
  chrome.storage.local.get(['playbackState']).then(async (data) => {
    if (data.playbackState) {
      isPlaying = data.playbackState.isPlaying;
      isPaused = data.playbackState.isPaused;
      currentBird = data.playbackState.currentBird;
      region = data.playbackState.region;
      
      console.log('[Background] Restored state:', {
        isPlaying,
        isPaused,
        currentBird: currentBird?.commonName,
        region
      });
      
      // 再生中だった場合は再開
      if (isPlaying && currentBird) {
        await setupOffscreen();
        
        // Offscreenの実際の状態を確認
        const offscreenState = await getOffscreenState();
        console.log('[Background] Offscreen actual state:', offscreenState);
        
        // Offscreenが再生していない場合のみ再開
        if (!offscreenState.isPlaying && !isPaused) {
          console.log('[Background] Resuming playback...');
          await playBirdAudio(currentBird);
        } else {
          console.log('[Background] Offscreen already playing, syncing state...');
        }
      }
    }
  });
});
