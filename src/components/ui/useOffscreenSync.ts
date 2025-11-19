import { useState, useCallback, useRef } from 'react';
import type { Bird } from '../../typeConst';

/**
 * Offscreen同期に使用するコールバック関数の型定義
 * 
 * 各コールバックは、Backgroundスクリプトから取得した状態を
 * Reactコンポーネントの状態に反映するために使用されます。
 */
interface UseOffscreenSyncCallbacks {
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentBird: (bird: Bird | null) => void;
  setRegion: (region: string) => void;
}

/**
 * Offscreenの状態を同期するカスタムフック
 * 
 * 【概要】
 * このフックは、Popupが開かれたときにBackgroundスクリプトから現在の再生状態を取得し、
 * Reactコンポーネントの状態を最新の状態に同期します。
 * 
 * これにより、Popupを閉じている間に再生が続いていた場合でも、
 * 再度Popupを開いたときに正確な状態（再生中、一時停止中、現在の鳥など）を表示できます。
 * 
 * 【同期の流れ】
 * 1. Popupが開かれる（または手動で `syncWithOffscreen()` が呼ばれる）
 * 2. `syncing` フラグが `true` になり、ローディング状態を表示
 * 3. Backgroundスクリプトに `{ type: 'getFullState' }` メッセージを送信
 * 4. Backgroundスクリプトが `getFullState()` を実行:
 *    - Offscreenドキュメントから音声の実状態を取得（`getOffscreenState()`）
 *    - Backgroundスクリプトの状態管理オブジェクトから情報を取得
 *    - 両方を統合して完全な状態を返す
 * 5. 取得した状態をReactコンポーネントの各状態に反映
 * 6. `syncing` フラグが `false` になり、通常のUIを表示
 * 
 * 【同期される情報】
 * - `isPlaying`: 再生中かどうか（Offscreenの実状態を優先）
 * - `isPaused`: 一時停止中かどうか（Offscreenの実状態を優先）
 * - `currentBird`: 現在再生中の鳥の情報（Birdオブジェクト）
 * - `region`: 選択中の地域
 * 
 * 【技術的な注意点】
 * - `useRef` を使ってコールバック関数を保持することで、依存配列の問題を回避しています
 *   これにより、コールバック関数が変更されても `syncWithOffscreen` を再作成する必要がありません
 * - `useCallback` の依存配列を空にすることで、関数の参照を安定させています
 * - `syncing` フラグは、同期中にローディング表示を行うために使用されます
 * 
 * 【使用例】
 * ```tsx
 * const { syncing, syncWithOffscreen } = useOffscreenSync({
 *   setIsPlaying,
 *   setIsPaused,
 *   setCurrentBird,
 *   setRegion
 * });
 * 
 * // 初期化時に同期
 * useEffect(() => {
 *   syncWithOffscreen();
 * }, []);
 * 
 * // 同期中の表示
 * if (syncing) {
 *   return <LoadingSpinner />;
 * }
 * ```
 * 
 * @param callbacks - 状態を更新するためのコールバック関数のオブジェクト
 * @returns `syncing` フラグと `syncWithOffscreen` 関数を含むオブジェクト
 */
export function useOffscreenSync(callbacks: UseOffscreenSyncCallbacks) {
  /** 同期処理中かどうかを示すフラグ（ローディング表示に使用） */
  const [syncing, setSyncing] = useState(true);
  
  // コールバックをrefで保持して、依存配列の問題を回避
  // これにより、コールバック関数が変更されても syncWithOffscreen を再作成する必要がない
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /**
   * Backgroundスクリプトから現在の再生状態を取得して、Reactコンポーネントの状態を同期する
   * 
   * この関数は、Popupが開かれたときや、手動で状態を更新したいときに呼び出されます。
   * Backgroundスクリプトの `getFullState()` は、Offscreenドキュメントの実状態と
   * Backgroundスクリプトの状態管理オブジェクトを統合して返します。
   */
  const syncWithOffscreen = useCallback(async () => {
    console.log('[BirdSongApp] Syncing with offscreen...');
    setSyncing(true);
    
    try {
      // Backgroundスクリプトに完全な状態を要求
      // Backgroundスクリプトは Offscreen の実状態と自身の状態を統合して返す
      const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
      console.log('[BirdSongApp] Full state received:', response);
      
      const cb = callbacksRef.current;
      
      // 再生中の場合は、すべての状態を反映
      if (response.isPlaying) {
        cb.setIsPlaying(true);
        cb.setIsPaused(response.isPaused || false);
        cb.setCurrentBird(response.currentBird);
        cb.setRegion(response.region || '');
        
        console.log('[BirdSongApp] State synced:', {
          isPlaying: true,
          isPaused: response.isPaused,
          bird: response.currentBird?.commonName
        });
      } else {
        // 再生していない場合は初期状態にリセット
        cb.setIsPlaying(false);
        cb.setIsPaused(false);
        cb.setCurrentBird(null);
      }
    } catch (error) {
      console.error('[BirdSongApp] Failed to sync state:', error);
      // エラーが発生した場合でも、syncing フラグを false にしてUIを表示可能にする
    } finally {
      setSyncing(false);
    }
  }, []); // 依存配列は空にして、refで最新のコールバックを参照

  return {
    /** 同期処理中かどうかを示すフラグ（true の間はローディング表示を推奨） */
    syncing,
    /** Backgroundスクリプトから状態を取得して同期する関数 */
    syncWithOffscreen
  };
}

