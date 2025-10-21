# BirdSong セットアップガイド

このガイドに従って、BirdSong拡張機能をセットアップしてください。

## 📋 前提条件

- Node.js (v18以上) がインストールされていること
- npm または yarn がインストールされていること
- Google Chrome がインストールされていること

## 🚀 セットアップ手順

### ステップ 1: Node.jsのインストール確認

コマンドプロンプトまたはPowerShellで以下を実行:

```bash
node --version
npm --version
```

バージョンが表示されればOKです。

### ステップ 2: プロジェクトディレクトリに移動

```bash
cd C:\dev\BirdSong
```

### ステップ 3: 依存関係のインストール

```bash
npm install
```

これには数分かかる場合があります。

### ステップ 4: アイコンファイルのコピー

#### 方法A: コマンドプロンプトを使用

```cmd
xcopy "C:\dev\zz_その他\BridsTab\icons\*" "C:\dev\BirdSong\public\icon\" /Y
```

#### 方法B: PowerShellを使用

```powershell
Copy-Item "C:\dev\zz_その他\BridsTab\icons\*" -Destination "C:\dev\BirdSong\public\icon\" -Force
```

#### 方法C: 手動でコピー

1. `C:\dev\zz_その他\BridsTab\icons` フォルダを開く
2. すべてのアイコンファイル（icon16.png, icon32.png, icon48.png, icon128.png）をコピー
3. `C:\dev\BirdSong\public\icon` フォルダに貼り付け

### ステップ 5: 開発モードでビルド

```bash
npm run dev
```

以下のようなメッセージが表示されればOK:

```
✓ Built in XXXms
```

### ステップ 6: Chromeに拡張機能を読み込む

1. Google Chrome を開く
2. アドレスバーに `chrome://extensions/` と入力してEnter
3. 右上の **「デベロッパーモード」** をONにする
4. **「パッケージ化されていない拡張機能を読み込む」** をクリック
5. フォルダ選択ダイアログで、以下のパスを選択:
   ```
   C:\dev\BirdSong\.output\chrome-mv3
   ```
6. 「フォルダーの選択」をクリック

### ステップ 7: 動作確認

1. Chrome のツールバーに BirdSong のアイコンが表示されます
2. アイコンをクリックしてポップアップを開く
3. 地域を選択（オプション）
4. **「Start Playback」** ボタンをクリック
5. 鳥の音声が再生されれば成功！

## 🎉 セットアップ完了！

これで BirdSong を使用する準備が整いました。

## 📝 よくある質問

### Q: `npm install` でエラーが出る

**A**: 以下を試してください:
1. Node.js のバージョンを確認（v18以上が必要）
2. `npm cache clean --force` を実行
3. `node_modules` フォルダを削除して再度 `npm install`

### Q: `npm run dev` でエラーが出る

**A**: 
1. `package.json` が正しく存在するか確認
2. `wxt` がインストールされているか確認: `npm list wxt`
3. 必要に応じて再インストール: `npm install wxt --save-dev`

### Q: Chromeに読み込めない

**A**: 
1. `.output/chrome-mv3` フォルダが存在するか確認
2. `npm run dev` が成功しているか確認
3. Chrome を再起動してみる

### Q: アイコンが表示されない

**A**: 
1. `public/icon` フォルダにアイコンファイルがあるか確認
2. ファイル名が正しいか確認（icon16.png, icon32.png, icon48.png, icon128.png）
3. 拡張機能をリロード

### Q: 音声が再生されない

**A**: 
1. インターネット接続を確認
2. Chrome DevTools (F12) でエラーログを確認
3. 拡張機能の「Service Worker」をクリックしてログを確認

## 🔄 開発中の変更適用方法

### コードを変更した場合

1. ファイルを保存
2. `npm run dev` が自動的にリビルド（実行中の場合）
3. Chrome拡張機能ページ (`chrome://extensions/`) で **「再読み込み」** ボタンをクリック
4. ポップアップを開き直す

### 手動でリビルドする場合

```bash
# 開発モード
npm run dev

# 本番ビルド
npm run build
```

## 📦 配布用ビルド

### ZIPファイルの作成

```bash
npm run zip
```

`.output` フォルダに ZIP ファイルが作成されます。

### Chrome Web Store へのアップロード

1. 上記の ZIP ファイルを作成
2. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
3. 新しいアイテムを作成してアップロード

## 🛠️ トラブルシューティング

### すべてをリセットして最初からやり直す

```bash
# node_modules と ビルド出力を削除
rmdir /s /q node_modules
rmdir /s /q .output
rmdir /s /q .wxt

# 再インストール
npm install

# 再ビルド
npm run dev
```

### パスの確認

プロジェクトが正しい場所にあるか確認:

```bash
dir C:\dev\BirdSong
```

以下のファイル/フォルダが表示されるはずです:
- package.json
- wxt.config.ts
- tsconfig.json
- entrypoints/
- public/
- README.md

## 📞 サポート

問題が解決しない場合は、以下を確認してください:

1. Node.js のバージョン
2. エラーメッセージの内容
3. どのステップで問題が発生したか

---

**最終更新**: 2025年1月
