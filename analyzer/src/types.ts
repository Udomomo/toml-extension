export interface TomlDiagnostic {
  readonly message: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface TomlAnalysis {
  readonly diagnostics: readonly TomlDiagnostic[];
}
