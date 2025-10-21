# 🎵 BirdSong - クイックスタートガイド

たった5分でBirdSongを始められます！

## ⚡ 最速セットアップ（5分）

### 1️⃣ アイコンをコピー（1分）

コマンドプロンプトで実行:

```cmd
xcopy "C:\dev\zz_その他\BridsTab\icons\*" "C:\dev\BirdSong\public\icon\" /Y
```

または、手動でコピー:
- `C:\dev\zz_その他\BridsTab\icons` の全ファイルを
- `C:\dev\BirdSong\public\icon` へコピー

### 2️⃣ 依存関係をインストール（2分）

```bash
cd C:\dev\BirdSong
npm install
```

### 3️⃣ ビルド（1分）

```bash
npm run dev
```

### 4️⃣ Chromeに読み込む（1分）

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」ON
3. 「パッケージ化されていない拡張機能を読み込む」
4. フォルダを選択: `C:\dev\BirdSong\.output\chrome-mv3`

### 5️⃣ 使ってみる！

1. ツールバーのBirdSongアイコンをクリック
2. 「Start Playback」をクリック
3. 🎵 鳥の音声を楽しむ！

---

## 🎯 基本的な使い方

### 再生開始
1. 拡張機能アイコンをクリック
2. 地域を選択（オプション）
3. 「▶️ Start Playback」ボタンをクリック

### 再生中
- **鳥の名前と画像**が表示されます
- **録音者、場所、日付**などの情報も表示
- 音声は自動的に次の鳥へ切り替わります

### コントロール
- **⏹️ Stop**: 再生を停止
- **⏭️ Skip**: 次の鳥へスキップ

---

## 🌍 地域選択

選択できる地域:
- **All Regions**: 世界中の鳥（推奨）
- **United States**: アメリカの鳥
- **Japan**: 日本の鳥
- **United Kingdom**: イギリスの鳥
- など多数

**ヒント**: 地域を指定しても、Macaulay Library APIの都合で期待通りの結果が得られない場合があります。その場合は「All Regions」を選択してください。

---

## 🔧 開発モード

### コードを変更したら

1. ファイルを保存
2. `npm run dev` が自動リビルド（実行中の場合）
3. `chrome://extensions/` で「再読み込み」
4. 拡張機能を使い直す

### 手動リビルド

```bash
npm run dev
```

---

## 📦 本番ビルド

配布用のビルドを作成:

```bash
npm run build
```

ZIPファイルを作成:

```bash
npm run zip
```

---

## ❓ よくある問題と解決方法

### 音声が再生されない
✅ インターネット接続を確認  
✅ F12でDevToolsを開いてエラーログを確認  
✅ 拡張機能をリロード

### ポップアップが開かない
✅ 拡張機能が有効になっているか確認  
✅ Chromeを再起動  
✅ 拡張機能を再読み込み

### ビルドエラー
✅ `npm install` を再実行  
✅ `node_modules` を削除して再インストール  
✅ Node.js のバージョンを確認（v18以上が必要）

---

## 📚 詳細ドキュメント

- **セットアップ**: `SETUP.md` - 詳細なセットアップ手順
- **README**: `README.md` - プロジェクト概要と技術詳細

---

**楽しんでください！** 🎵🐦
