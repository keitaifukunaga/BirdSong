import { useState, useEffect, useCallback } from 'react';
import { i18n } from '../../util/commonfunc';

interface WaitingStatusProps {
  // props は不要になりました
}

export default function WaitingStatus({}: WaitingStatusProps) {
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingRemainingTime, setWaitingRemainingTime] = useState(0);

  // 初期状態を取得
  const syncState = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
      if (response.isWaiting !== undefined) {
        setIsWaiting(response.isWaiting || false);
        setWaitingRemainingTime(response.waitingRemainingTime || 0);
      }
    } catch (error) {
      console.error('[WaitingStatus] Failed to get initial state:', error);
    }
  }, []);

  // Backgroundからのイベントを受信
  useEffect(() => {
    const messageListener = (msg: any) => {
      if (msg.type === 'popupEvent') {
        // 次の鳥の音声を待機する期間が開始された時（60秒間）
        if (msg.event === 'waitingStarted') {
          console.log('[WaitingStatus] Waiting started');
          setIsWaiting(true);
          setWaitingRemainingTime(60000); // 60秒から開始
        } 
        // 待機がキャンセルされた時（ユーザーが停止ボタンを押した時など）
        else if (msg.event === 'waitingCancelled') {
          console.log('[WaitingStatus] Waiting cancelled');
          setIsWaiting(false);
          setWaitingRemainingTime(0);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 初期化時に状態を取得
    syncState();

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [syncState]);
  // カウントダウン用のuseEffect
  useEffect(() => {
    if (!isWaiting || waitingRemainingTime <= 0) {
      return;
    }

    const interval = setInterval(async () => {
      // バックグラウンドから最新の残り時間を取得
      try {
        const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
        if (response.waitingRemainingTime !== undefined) {
          setWaitingRemainingTime(response.waitingRemainingTime);
          
          // 待機が終了した場合
          if (response.waitingRemainingTime <= 0) {
            setIsWaiting(false);
          }
        }
      } catch (error) {
        console.error('[WaitingStatus] Failed to get remaining time:', error);
        // エラーの場合は手動でカウントダウン
        setWaitingRemainingTime(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setIsWaiting(false);
            return 0;
          }
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWaiting, waitingRemainingTime, setIsWaiting, setWaitingRemainingTime]);

  // 常に同じ位置を確保するため、待機中でなくてもスペースを確保
  return (
    <div 
      className="waiting-status-icon"
      style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.65rem',
        color: isWaiting ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
        backgroundColor: 'transparent',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        pointerEvents: 'none',
        transition: 'color 0.2s ease',
        minWidth: '80px', // レイアウトシフトを防ぐため最小幅を確保
        justifyContent: 'flex-end',
      }}
    >
      <span style={{ fontSize: '0.75rem' }}>ℹ️</span>
      {isWaiting && (
        <span style={{
          fontSize: '0.65rem',
          fontWeight: '400',
          whiteSpace: 'nowrap',
          lineHeight: '1.2'
        }}>
          {i18n('nextInSeconds', Math.ceil(waitingRemainingTime / 1000).toString())}
        </span>
      )}
    </div>
  );
}

