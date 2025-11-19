import { useEffect, useRef } from 'react';
import type { Bird } from '../../typeConst';

/**
 * メッセージリスナーに渡すコールバック関数の型定義
 * 
 * 各コールバックは、Backgroundスクリプトから送られてくるイベントに応じて
 * Reactコンポーネントの状態を更新するために使用されます。
 */
interface MessageListenerCallbacks {
  setCurrentBird: (bird: Bird | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Backgroundスクリプトからのイベントを受信するカスタムフック
 * 
 * 【概要】
 * このフックは、Backgroundスクリプト（entrypoints/background.ts）から送られてくる
 * `popupEvent` タイプのメッセージを受信し、それに応じてReactコンポーネントの状態を更新します。
 * 
 * 【メッセージの流れ】
 * 1. Backgroundスクリプトが音声再生の状態変化を検知
 *    （例: 新しい鳥の音声が開始された、一時停止された、など）
 * 2. Backgroundスクリプトが `popupNotifier.ts` の `notifyPopup()` を呼び出し
 * 3. `notifyPopup()` が `{ type: 'popupEvent', event: 'イベント名', data: データ }` を送信
 * 4. このフックが `chrome.runtime.onMessage` でメッセージを受信
 * 5. イベントタイプに応じて、適切なコールバック関数を呼び出して状態を更新
 * 
 * 【処理するイベント】
 * - `birdChanged`: 新しい鳥の音声が選択された時（msg.data に Bird オブジェクトが含まれる）
 * - `audioStarted`: 音声の再生が開始された時
 * - `audioPaused`: 音声が一時停止された時
 * - `audioResumed`: 一時停止から再生が再開された時
 * - `waitingStarted`: 次の鳥の音声を待機する期間が開始された時（60秒間）
 *    （このイベントは `WaitingStatus` コンポーネントで処理されます）
 * - `waitingCancelled`: 待機がキャンセルされた時（ユーザーが停止ボタンを押した時など）
 *    （このイベントは `WaitingStatus` コンポーネントで処理されます）
 * 
 * 【技術的な注意点】
 * - `useRef` を使ってコールバック関数を保持することで、依存配列の問題を回避しています
 *   これにより、コールバック関数が変更されてもリスナーを再登録する必要がありません
 * - `useEffect` の依存配列を空にすることで、コンポーネントのマウント時に一度だけ
 *   リスナーを登録し、アンマウント時にクリーンアップします
 * 
 * @param callbacks - 状態を更新するためのコールバック関数のオブジェクト
 * 
 * @example
 * ```tsx
 * useMessageListener({
 *   setCurrentBird,
 *   setIsPlaying,
 *   setIsPaused,
 *   setLoading
 * });
 * ```
 */
export function useMessageListener(callbacks: MessageListenerCallbacks) {
  // コールバックをrefで保持して、依存配列の問題を回避
  // これにより、コールバック関数が変更されてもリスナーを再登録する必要がない
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    /**
     * Chrome拡張機能のメッセージリスナー
     * Backgroundスクリプトから送られてくるメッセージを受信します
     */
    const messageListener = (msg: any) => {
      console.log('[BirdSongApp] Received message:', msg.type, msg);

      // Backgroundスクリプトから送られてくる `popupEvent` タイプのメッセージを処理
      if (msg.type === 'popupEvent') {
        const cb = callbacksRef.current;
        
        // 新しい鳥の音声が選択された時
        if (msg.event === 'birdChanged') {
          console.log('[BirdSongApp] Bird changed:', msg.data);
          cb.setCurrentBird(msg.data);
          // 再生中のイベントなので isPlaying を true に保つ
          cb.setIsPlaying(true);
          cb.setLoading(false);
        } 
        // 音声の再生が開始された時（Offscreenから通知される）
        else if (msg.event === 'audioStarted') {
          console.log('[BirdSongApp] Audio started');
          cb.setIsPlaying(true);
          cb.setIsPaused(false);
          cb.setLoading(false);
        } 
        // 音声が一時停止された時
        else if (msg.event === 'audioPaused') {
          console.log('[BirdSongApp] Audio paused');
          // 一時停止してもセッションは継続中なので isPlaying は true のまま
          cb.setIsPlaying(true);
          cb.setIsPaused(true);
        } 
        // 一時停止から再生が再開された時
        else if (msg.event === 'audioResumed') {
          console.log('[BirdSongApp] Audio resumed');
          cb.setIsPlaying(true);
          cb.setIsPaused(false);
        }
      }
    };

    // Chrome拡張機能のメッセージリスナーを登録
    chrome.runtime.onMessage.addListener(messageListener);

    // クリーンアップ: コンポーネントのアンマウント時にリスナーを削除
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []); // 依存配列は空にして、refで最新のコールバックを参照
}

