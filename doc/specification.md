# TOML 1.1.0 Language Server Extension 実装仕様

## 概要

全 `.toml` ファイルを対象に、TOML 1.1.0準拠のシンタックスハイライト、編集支援、構文・意味エラー診断を提供する。

用途別JSON Schema、mise固有仕様、候補サジェスト、固定スニペットは今回の対象外とする。そのため、miseで存在しないキーを使用しても、TOMLとして正しければエラーにはしない。

## 対応仕様

- [TOML 1.1.0仕様](https://toml.io/en/v1.1.0)と[公式ABNF](https://github.com/toml-lang/toml/blob/1.1.0/toml.abnf)を基準とする。
- 次の構文をすべて受理・色分けする。
  - コメント、bare/quoted/dotted key
  - basic/literal/multiline文字列と全エスケープ
  - 10・16・8・2進整数、浮動小数点、`inf`、`nan`
  - 真偽値
  - offset/local date-time、local date、local time
  - 配列、通常テーブル、inline table、配列テーブル
- TOML 1.1追加機能である複数行・末尾カンマ付きinline table、`\xHH`、`\e`、秒省略日時を正式対応する。[TOML 1.1リリースノート](https://github.com/toml-lang/toml/releases)
- 重複キー、テーブル再定義、値とテーブルの衝突、不正な日時・数値・エスケープ、未閉じ文字列・配列など、仕様上invalidとなる入力を診断する。
- 1文書につき最初の確実なエラー1件だけを、`Error` severity・`toml-extension` sourceで表示する。
- UTF-8不正バイトはLSP到達前にVS CodeがUnicode文字列へ変換するため診断対象外とし、この制限をREADMEへ明記する。
- パーサーの実装上限としてネスト深度256を採用し、超過はエラーにする。整数はBigIntモードで解析して符号付き64-bit範囲を損失なく扱う。

## 実装変更

- `toml@5.0.0`をバージョン固定で導入する。この実装はTOML 1.1の公式テストについて、不正UTF-8 6件以外を通過し、エラーの行・列を提供する。[toml-node](https://github.com/BinaryMuse/toml-node)
- 最低VS Codeバージョンを`^1.92.0`へ更新する。VS Code 1.92はNode.js 20を搭載しており、採用パーサーのNode 20以上という要件を満たす。[VS Code 1.92](https://code.visualstudio.com/updates/v1_92)
- Language Serverはincremental text syncを維持し、open/changeから150msの文書別デバウンス後に診断する。古い文書versionの結果は破棄し、close時はタイマーと診断を消去する。
- パーサーの1-based行・列をLSPの0-based UTF-16位置へ変換し、通常は問題文字1文字、EOFエラーは直前文字からEOFまでを範囲にする。想定外例外はサーバーを停止させずログへ出す。
- `completionProvider`と空の`onCompletion`を削除する。今回、Language Serverは補完候補APIを公開しない。
- TextMate grammarを追加し、標準的なscopeでキー、テーブル名、文字列、エスケープ、数値、真偽値、日時、コメント、区切り記号を分類する。独自色は指定せず、利用中のVS Codeテーマへ委ねる。[VS Code Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
- `language-configuration.json`で以下を提供する。
  - `[]`、`{}`、`""`、`''`、`""""""`、`''''''`の自動閉じ
  - `[]`、`{}`、引用符の選択範囲囲み
  - コメント・文字列内での不要な自動閉じを抑止
  - 複数行配列とinline table内での字下げ、閉じ括弧行での字下げ解除
  - `#`によるコメント切り替え
  - TOMLに存在しない`()`は対象にしない
- READMEへ対応バージョン、対応構文、診断が先頭1件であること、非対応項目、最低VS Codeバージョンを記載する。

## テスト計画

- `node:test`で診断ロジックを単体テストする。
  - 全値型、4種類の文字列、各数値表現、4種類の日時、配列・テーブル・配列テーブル
  - TOML 1.1追加構文
  - 重複キー、再定義、型衝突、不正日時、制御文字、未閉じ構文
  - LF/CRLF、非ASCII文字直後、先頭・行中・EOFにおける診断範囲
  - デバウンス、古いversion破棄、修正・close後の診断消去
- [公式toml-test](https://github.com/toml-lang/toml-test)をTOML 1.1モードで実行し、全validの受理と全invalidの拒否を確認する。不正UTF-8 6件のみ、理由付きの明示的skipリストへ入れ、それ以外の差異は失敗扱いにする。
- `vscode-textmate`と`vscode-oniguruma`でgrammarをテストし、文字列内の`#`、コメント内の括弧、複数行文字列・配列・inline table、1.1エスケープのscopeを確認する。
- VS Code Extension Development Hostで、各自動閉じ、三連引用符、囲み、改行時の字下げ、リアルタイム診断をスモークテストする。
- 最終受入として`npm run check-types`、全テスト、コンパイル、VSIXパッケージ生成を成功させる。

## 前提・対象外

- デスクトップ版およびNode.js extension hostで動くRemote環境を対象とし、Web版VS Codeは対象外とする。
- JSON Schema、SchemaStore、ファイル用途別検証、mise固有検証、hover、definition、formatting、document symbols、code actionsは対象外とする。
- エラーメッセージは採用パーサーの英語メッセージを使用し、ローカライズしない。
- 内容依存補完は将来の別機能とし、今回のLSPインターフェースには予約的なAPIや設定を追加しない。
