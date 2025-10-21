import BirdSongApp from '../../src/components/BirdSongApp';
import { useEffect } from 'react';

function View() {
  useEffect(() => {
    // ウィンドウが開いた時にフラグを設定
    const setWindowOpenFlag = async () => {
      try {
        await chrome.storage.local.set({ viewWindowOpen: true });
      } catch (error) {
        console.error('Failed to set window open flag:', error);
      }
    };

    setWindowOpenFlag();

    // ウィンドウが閉じられる時の処理
    const handleBeforeUnload = async () => {
      try {
        await chrome.storage.local.remove(['viewWindowOpen']);
      } catch (error) {
        console.error('Failed to remove window open flag:', error);
      }
    };

    // ページが閉じられる前にフラグを削除
    window.addEventListener('beforeunload', handleBeforeUnload);

    // クリーンアップ
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // コンポーネントがアンマウントされる時もフラグを削除
      chrome.storage.local.remove(['viewWindowOpen']).catch(console.error);
    };
  }, []);

  return <BirdSongApp />;
}

export default View;
