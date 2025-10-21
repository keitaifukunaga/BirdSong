import BirdSongApp from '../../src/components/BirdSongApp';

function App() {
  const handleOpenInNewWindow = async () => {
    try {
      // ストレージでviewウィンドウの開閉状態をチェック
      const result = await chrome.storage.local.get(['viewWindowOpen']);
      
      if (result.viewWindowOpen) {
        console.log('View window is already open');
        return;
      }

      // 新しいウィンドウでviewを開く
      await chrome.windows.create({
        url: chrome.runtime.getURL('view.html'),
        type: 'popup',
        width: 500,
        height: 700,
        focused: true
      });
    } catch (error) {
      console.error('Failed to open new window:', error);
    }
  };

  return <BirdSongApp onOpenInNewWindow={handleOpenInNewWindow} />;
}

export default App;
