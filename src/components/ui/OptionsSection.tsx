import { useState, useEffect } from 'react';
import { i18n } from '../../util/commonfunc';

export default function OptionsSection() {
  const [autoResume, setAutoResume] = useState(true);

  // オプション設定の保存
  const saveAutoResumeSetting = async (value: boolean) => {
    try {
      await chrome.storage.sync.set({ autoResume: value });
      setAutoResume(value);
    } catch (error) {
      console.error('[OptionsSection] Failed to save autoResume setting:', error);
    }
  };

  // 初期化: 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await chrome.storage.sync.get(['autoResume']);
        setAutoResume(settings.autoResume !== false); // デフォルトはtrue
      } catch (error) {
        console.error('[OptionsSection] Failed to load autoResume setting:', error);
      }
    };
    
    loadSettings();
  }, []);

  return (
    <section className="options-section mb-2">
      <div className="option-item">
        <label htmlFor="auto-resume-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="auto-resume-checkbox"
            type="checkbox"
            checked={autoResume}
            onChange={(e) => saveAutoResumeSetting(e.target.checked)}
          />
          <span><strong>{i18n('autoResumeOption')}</strong></span>
        </label>
      </div>
    </section>
  );
}

