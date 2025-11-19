import { useState, useEffect, useCallback } from 'react';
import type { Bird } from '../../typeConst';
import { i18n } from '../../util/commonfunc';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  loading: boolean;
  region: string;
  setLoading: (loading: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentBird: (bird: Bird | null) => void;
}

export default function PlaybackControls({
  isPlaying,
  isPaused,
  loading,
  region,
  setLoading,
  setIsPlaying,
  setIsPaused,
  setCurrentBird
}: PlaybackControlsProps) {
  const [isWaiting, setIsWaiting] = useState(false);

  // 初期状態を取得
  const syncState = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
      if (response.isWaiting !== undefined) {
        setIsWaiting(response.isWaiting || false);
      }
    } catch (error) {
      console.error('[PlaybackControls] Failed to get initial state:', error);
    }
  }, []);

  // Backgroundからのイベントを受信
  useEffect(() => {
    const messageListener = (msg: any) => {
      if (msg.type === 'popupEvent') {
        // 次の鳥の音声を待機する期間が開始された時
        if (msg.event === 'waitingStarted') {
          console.log('[PlaybackControls] Waiting started');
          setIsWaiting(true);
        } 
        // 待機がキャンセルされた時
        else if (msg.event === 'waitingCancelled') {
          console.log('[PlaybackControls] Waiting cancelled');
          setIsWaiting(false);
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
  // 次の鳥を再生
  const playNext = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'next',
        region
      });
      if (response.bird) {
        setCurrentBird(response.bird);
      }
    } catch (error) {
      console.error('[PlaybackControls] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 再生開始
  const handleStart = async () => {
    setLoading(true);
    try {
      await chrome.storage.sync.set({ region });
      
      const response = await chrome.runtime.sendMessage({
        type: 'start',
        region
      });

      if (response.success && response.bird) {
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentBird(response.bird);
      }
    } catch (error) {
      console.error('[PlaybackControls] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 一時停止
  const handlePause = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'pause' });
      setIsPaused(true);
    } catch (error) {
      console.error('[PlaybackControls] Pause error:', error);
    }
  };

  // 再開
  const handleResume = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'resume' });
      setIsPaused(false);
    } catch (error) {
      console.error('[PlaybackControls] Resume error:', error);
    }
  };

  // 停止
  const handleStop = async () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentBird(null);

    try {
      await chrome.runtime.sendMessage({ type: 'stop' });
    } catch (error) {
      console.error('[PlaybackControls] Stop error:', error);
    }
  };
  return (
    <section className="control-section">
      {!isPlaying ? (
        <button
          className="btn btn-primary btn-large"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? i18n('loading') : i18n('startPlayback')}
        </button>
      ) : (
        <div className="playback-controls">
          {!isPaused ? (
            <button
              className="btn btn-warning"
              onClick={handlePause}
              disabled={loading}
            >
              {i18n('pause')}
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleResume}
              disabled={loading}
            >
              {i18n('resume')}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={playNext}
            disabled={loading || isPaused || isWaiting}
          >
            {i18n('skip')}
          </button>
          <button
            className="btn btn-danger"
            onClick={handleStop}
            disabled={loading}
          >
            {i18n('stop')}
          </button>
        </div>
      )}
    </section>
  );
}

