/**
 * ポップアップへイベント通知を送信します。
 * ポップアップが閉じている場合はエラーを無視します。
 *
 * @param event イベント名
 * @param data 任意のペイロード
 */
export function notifyPopup(event: string, data?: any): void {
  chrome.runtime.sendMessage({
    type: 'popupEvent',
    event,
    data
  }).catch(() => {
    // ポップアップが閉じている場合は無視
  });
}

