# TOML 1.1.0 Language Server Extension 仕様

## 概要

すべての `.toml` ファイルを対象とする、汎用的なVS Code拡張機能を実装する。

この拡張機能は、TOML 1.1.0に準拠した次の機能を提供する。

- TextMate Grammarによるシンタックスハイライト
- 括弧や引用符の自動閉じなどの編集支援
- TOMLの構文および意味上の誤りに対する診断

特定のアプリケーションや設定ファイル形式には依存しない。miseの設定ファイルも通常のTOML文書として扱う。

## 前提

### 準拠仕様

- [TOML 1.1.0仕様](https://toml.io/en/v1.1.0)を言語仕様の基準とする。
- 文法の詳細は[TOML 1.1.0公式ABNF](https://github.com/toml-lang/toml/blob/1.1.0/toml.abnf)を基準とする。
- 適合性の確認には[公式toml-test](https://github.com/toml-lang/toml-test)を使用する。

### 実行環境

- デスクトップ版VS Codeを対象とする。
- Node.js Extension Hostを使用するRemote環境を対象とする。
- 最低対応バージョンはVS Code `^1.92.0`とする。VS Code 1.92はNode.js 20を搭載しており、採用するパーサーの実行要件を満たす。
- Web版VS Codeは対象外とする。

### TOMLパーサー

- [`toml@5.0.0`](https://github.com/BinaryMuse/toml-node)をバージョン固定で使用する。
- 符号付き64-bit整数を精度損失なく検証するため、BigIntモードで解析する。
- 実装上の最大ネスト深度を256とし、超過した文書はエラーとする。
- 利用者に表示する診断メッセージにはパーサーの英語メッセージを使用し、ローカライズしない。
- パーサーから返る解析済みの値は利用せず、文書が有効かどうかとエラー位置だけを使用する。

## 対応範囲

### TOML構文

TOML 1.1.0で定義される次の構文を受理し、シンタックスハイライトの対象とする。

- コメント
- bare key、quoted key、dotted key
- basic string、literal string、およびそれぞれの複数行文字列
- 10進・16進・8進・2進整数
- 浮動小数点数、`inf`、`nan`
- 真偽値
- offset date-time、local date-time、local date、local time
- 配列
- 通常テーブル
- inline table
- 配列テーブル

TOML 1.1で追加された次の構文も正式に対応する。

- 複数行のinline table
- inline table内の末尾カンマ
- basic string内の `\xHH` および `\e` エスケープ
- 秒を省略した日時および時刻

### シンタックスハイライト

- TextMate Grammarを使用し、キー、テーブル名、文字列、エスケープ、数値、真偽値、日時、コメント、区切り記号を標準的なscopeへ分類する。
- 拡張機能独自の配色は定義せず、利用中のVS Codeテーマによる色付けに委ねる。
- 実装方法は[VS Code Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)に従う。

### 編集支援

`language-configuration.json`で次の動作を提供する。

- `[]`、`{}`、`""`、`''`、`""""""`、`''''''`の自動閉じ
- `[]`、`{}`、引用符による選択範囲の囲み
- コメントおよび文字列内での不要な自動閉じの抑止
- 複数行配列とinline table内でのインデント
- 閉じ括弧を入力した行でのインデント解除
- `#`によるコメント切り替え

TOMLの構文ではない丸括弧 `()` の自動閉じは提供しない。編集支援の実装方法は[VS Code Language Configuration Guide](https://code.visualstudio.com/api/language-extensions/language-configuration-guide)に従う。

### エラー診断

次のような、TOML 1.1.0でinvalidとされる入力を診断する。

- 重複キー
- テーブルの再定義
- 値とテーブルの衝突
- 不正な数値、日時、エスケープ、制御文字
- 未閉じの文字列、配列、inline table
- 最大ネスト深度256の超過

診断の表示および更新には次の規則を適用する。

- 1文書につき、パーサーが最初に報告した確実なエラー1件だけを表示する。
- severityは `Error`、sourceは `toml-extension` とする。
- 文書のopenまたはchangeから150msの文書別デバウンス後に診断する。
- 診断中に文書versionが更新された場合、古いversionに対する結果を破棄する。
- 文書が有効になった場合、および文書をcloseした場合は既存の診断を消去する。
- 通常は問題のある1文字を範囲とし、EOFエラーは直前の文字からEOFまでを範囲とする。
- 想定外の例外はLanguage Serverを停止させず、ログへ記録する。

## 対象外

次の機能は今回の実装に含めない。

- JSON SchemaおよびSchemaStoreとの連携
- ファイル用途別の検証
- mise固有のキー、テーブル、値の検証や補完
- 文書内容に依存する補完候補
- 固定スニペット
- hover
- definition
- formatting
- document symbols
- code actions
- Web版VS Codeへの対応

Language Serverは補完候補APIを公開せず、将来向けの予約APIや設定も追加しない。

### 不正UTF-8の制限

VS CodeとLanguage Server Protocolは、ファイル内容をデコード済みのUnicode文字列としてLanguage Serverへ渡す。そのため、デコード前の不正なUTF-8バイト列はLanguage Serverへ到達せず、診断できない。

公式toml-testのうち、不正UTF-8バイト列そのものを検証する6件はこの制限の対象とする。それ以外のvalidケースはすべて受理し、invalidケースはすべて拒否する。

## 関連ドキュメント

実装時にREADMEへ次の内容を反映する。

- 対応するTOMLおよびVS Codeのバージョン
- 対応構文と編集支援
- 診断が文書ごとに先頭1件であること
- 対象外の機能
- 不正UTF-8バイト列を診断できない制限

