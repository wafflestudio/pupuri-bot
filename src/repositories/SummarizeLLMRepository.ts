export type SummarizeLLMRepository = {
  summarizeReleaseNote: (content: string, options: { maxLen: number }) => Promise<string>;
};
