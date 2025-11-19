// WXTフレームワークのグローバル型定義
declare function defineBackground(callback: () => void | Promise<void>): void;
declare function defineUnlistedScript(callback: () => void | Promise<void>): void;
declare function defineContentScript(config: {
  matches: string[];
  main?: () => void | Promise<void>;
}): void;

