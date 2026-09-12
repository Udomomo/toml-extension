# TOML Language Server Extension ディレクトリ構成

## ディレクトリ構成

以下は初期の案である。実装中に責務が大きくなった場合は適宜ファイルやフォルダを分割してよい。
重要なのは、`analyzer`、`server`、`client`の責務を明確に分離することである。

```text
toml-extension/
├── analyzer/
│   ├── src/
│   │   ├── index.ts
│   │   ├── analyze.ts
│   │   └── types.ts
│   ├── test/
│   │   ├── analyze.test.ts
│   │   ├── conformance.test.ts
│   │   └── fixtures/
│   └── tsconfig.json
├── server/
│   ├── src/
│   │   ├── server.ts
│   │   └── diagnostics.ts
│   ├── test/
│   │   └── diagnostics.test.ts
│   └── tsconfig.json
├── client/
│   ├── src/extension.ts
│   ├── test/extension.test.ts
│   └── tsconfig.json
├── tools/
│   └── toml-test/
│       └── v2.2.0/
│           ├── darwin-arm64/toml-test
│           ├── linux-amd64/toml-test
│           ├── README.md
│           └── LICENSE
├── syntaxes/
│   ├── toml.tmLanguage.json
│   └── test/grammar.test.ts
├── docs/
│   ├── specification.md
│   └── structure.md
├── language-configuration.json
├── tsconfig.base.json
├── tsconfig.test.json
├── tsconfig.json
├── package.json
└── README.md
```

## 各ディレクトリの責務

### `analyzer`

TOMLの解析と、パーサー固有のエラーからエディター非依存の診断への変換を担当する。

- `src/analyze.ts`: TOMLの解析、エラー位置のoffsetへの変換、診断の生成
- `src/types.ts`: 公開する解析結果と診断型
- `src/index.ts`: analyzerの公開API
- `test/analyze.test.ts`: 解析と診断offsetの単体テスト
- `test/conformance.test.ts`: 公式toml-testを使った適合性テスト
- `test/conformance/decoder.ts`: 公式typed JSONを出力するテスト専用decoder
- `test/fixtures/`: analyzerのテストに固有の入力データ

`analyzer`はVS Code、Language Server Protocol、`client`、`server`のいずれにも依存させない。これにより、エディターを起動せずに適合性テストを実行でき、将来ほかのフロントエンドからも再利用できる。

### `server`

Language Server Protocolの通信と文書ライフサイクルを担当する。TOMLの解析規則は実装しない。

- `src/server.ts`: LSP connection、文書同期、open/change/closeイベント、診断の送信
- `src/diagnostics.ts`: デバウンス、文書versionの確認、analyzer診断からLSP Diagnosticへの変換
- `test/diagnostics.test.ts`: LSP境界と診断スケジューリングの単体テスト

### `client`

VS Code拡張機能の起動、Language Clientの構成、Language Serverプロセスの管理を担当する。

### `syntaxes`と`language-configuration.json`

シンタックスハイライトと編集支援はVS Code固有機能であるため、`analyzer`には含めない。

- `syntaxes/toml.tmLanguage.json`: TextMate Grammar
- `syntaxes/test/grammar.test.ts`: TextMate scopeのテスト
- `language-configuration.json`: コメント、自動閉じ、囲み、インデントの設定

## 依存関係とビルド

依存方向は次のとおりとする。

```text
VS Code
  └── client
        └── server process
              └── analyzer
                    └── toml parser
```

- `analyzer`、`server`、`client`を個別のTypeScript composite projectにする。
- ルートの`tsconfig.json`は`analyzer`、`server`、`client`をproject referenceとして列挙する。
- `server/tsconfig.json`は`analyzer`をproject referenceとして参照する。
- 共通のコンパイラ設定は`tsconfig.base.json`へ置く。
- `tsconfig.test.json`で各機能の近くに置いたテストを型チェックする。
- ビルド結果はそれぞれ`out/analyzer`、`out/server`、`out/client`へ出力する。
- npm workspaceや`analyzer/package.json`は作成せず、1つのVS Code拡張機能パッケージとして配布する。

`server`から`analyzer`を参照するときは、ソースツリーをまたぐ相対importではなく、ルート`package.json`の内部import `#analyzer`を使用する。

```json
{
  "imports": {
    "#analyzer": {
      "types": "./out/analyzer/index.d.ts",
      "default": "./out/analyzer/index.js"
    }
  }
}
```

TypeScriptでもこの内部importを解決できるよう、共通設定ではNode.jsのpackage importsに対応したmodule resolutionを使用する。ビルド時はproject referenceにより`analyzer`を`server`より先に生成する。

VSIXには`out/analyzer`を含め、`analyzer`のソースとテストは含めない。実行時依存である`toml`パッケージもVSIXへ含める。

公式適合性テストのrunnerと固定バイナリは`tools/toml-test/v2.2.0`に置く。macOS arm64では`darwin-arm64/toml-test`、Linux x64では`linux-amd64/toml-test`を使用し、その他のOS・CPUでは未対応環境としてテストを失敗させる。バイナリの出所、取得手順、SHA-256、MIT Licenseは同じディレクトリの`README.md`と`LICENSE`に記録する。

適合性テストは次のコマンドで実行する。decoderはstdinからTOMLを読み、公式typed JSONをstdoutへ出力するテスト専用コードである。

```sh
npm run test:conformance
```

runnerは`toml-test test -toml=1.1`を実行し、VS CodeとLanguage Serverで復元できない不正UTF-8に関する次の6件だけを個別にskipする。`-skip-must-err`により、skip対象が将来通常成功するとテストも失敗する。

- `invalid/encoding/bad-codepoint`
- `invalid/encoding/bad-utf8-in-comment`
- `invalid/encoding/bad-utf8-in-multiline`
- `invalid/encoding/bad-utf8-in-multiline-literal`
- `invalid/encoding/bad-utf8-in-string`
- `invalid/encoding/bad-utf8-in-string-literal`

テスト用バイナリ、decoder、適合性テストコードは`.vscodeignore`でVSIXから除外し、ビルド済みの`out/analyzer`と実行時依存の`toml`は除外しない。

## 解析APIとLSP境界

`analyzer`の公開APIを次の形で固定する。

```ts
export interface TomlDiagnostic {
  readonly message: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface TomlAnalysis {
  readonly diagnostics: readonly TomlDiagnostic[];
}

export function analyzeToml(source: string): TomlAnalysis;
```

### APIの規則

- `startOffset`と`endOffset`はJavaScript文字列のUTF-16コード単位とする。
- 範囲は`startOffset`を含み、`endOffset`を含まない半開区間とする。
- 有効な文書では`diagnostics`を空配列とする。
- 無効な文書では最初の確実なエラーだけを含む要素数1の配列とする。
- パーサー固有のエラー型、LSP型、解析済みTOML値は公開しない。
- 入力文字列から得られる結果以外の状態を保持せず、同じ入力には同じ結果を返す。

### 責務の境界

`analyzer`は次を担当する。

- `toml@5.0.0`による解析
- BigIntモードと最大ネスト深度256の指定
- パーサーの1-based行・列からUTF-16 offsetへの変換
- 通常エラーとEOFエラーの診断範囲の決定
- パーサー固有エラーの`TomlDiagnostic`への変換

`server`は次を担当する。

- `TextDocument.positionAt()`によるoffsetから0-based LSP Positionへの変換
- `TomlDiagnostic`からseverity `Error`、source `toml-extension`のLSP Diagnosticへの変換
- 文書単位の150msデバウンス
- 解析開始時と送信前の文書version確認
- 文書修正後とclose時の診断消去
- 想定外例外のログ記録

この境界により、`analyzer`はLSPのposition encodingや文書管理を認識せず、`server`はTOMLの構文やパーサー固有エラーを認識しない。

## テスト

テストは対象機能に近いディレクトリへ配置し、TypeScriptの`node:test`で実装する。

### Analyzerテスト

- TOML 1.1.0で定義されるすべての値型、キー、配列、テーブルを検証する。
- 複数行inline table、末尾カンマ、`\xHH`、`\e`、秒省略日時を検証する。
- 重複キー、再定義、型衝突、不正日時、不正数値、制御文字、未閉じ構文を検証する。
- LF、CRLF、非ASCII文字の直後、文書先頭、行中、EOFで診断offsetを検証する。
- 最大ネスト深度256の境界値と超過を検証する。
- 公式toml-testをTOML 1.1モードで実行し、すべてのvalid入力の受理とinvalid入力の拒否を確認する。
- 不正UTF-8バイト列を対象とする6件だけを、個別のパスと理由を記載した明示的なskipリストへ入れる。ワイルドカードによるskipは使用しない。
- 上記6件以外の公式テストとの差異はテスト失敗とする。

### Serverテスト

- UTF-16 offsetからLSP Rangeへの変換を検証する。
- LF、CRLF、サロゲートペアを含む非ASCII文字、EOFの位置を検証する。
- open/changeから150ms後に最新versionの診断だけが送信されることを検証する。
- デバウンス中の再変更でタイマーが更新されることを検証する。
- 古いversionの解析結果が送信されないことを検証する。
- 文書が有効になった場合とcloseした場合に診断が消去されることを検証する。
- 想定外例外が発生してもLanguage Serverが継続することを検証する。

### Grammarテスト

`vscode-textmate`と`vscode-oniguruma`を使用し、次のscopeを検証する。

- キー、テーブル名、各値型、コメント、区切り記号
- 文字列内の `#` がコメントにならないこと
- コメント内の括弧や引用符が構文として扱われないこと
- 複数行文字列、配列、inline table
- TOML 1.1で追加されたエスケープ

### Clientと統合テスト

VS Code Extension Development Hostで次を確認する。

- `.toml`ファイルで拡張機能とLanguage Serverが起動すること
- 括弧、引用符、三連引用符の自動閉じと囲み
- コメント切り替えと改行時のインデント
- 編集中のリアルタイム診断と、修正後の診断消去

### 最終受入

次の処理がすべて成功することを完了条件とする。

```sh
npm run check-types
npm test
npm run compile
npm run package
```
