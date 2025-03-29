import type OpenAI from 'openai';

import type { implementDeploymentService } from '../services/GithubDeploymentService';

export const implementOpenAiSummarizeRepository = ({
  openaiClient,
}: {
  openaiClient: Pick<OpenAI['chat']['completions'], 'create'>;
}): Parameters<typeof implementDeploymentService>[0]['summarizeLLMRepository'] => {
  return {
    summarizeReleaseNote: async (content, { maxLen }) => {
      try {
        const prompt = `이 내용은 배포에 쓰이는 릴리즈 노트야. 개발자들을 위해 ${maxLen}자 이내의 한글 문장 한 개로 요약해줘.`;

        const response = await openaiClient.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: content },
          ],
          temperature: 0.7,
          max_tokens: maxLen,
          top_p: 1,
        });

        return response.choices[0]?.message.content ?? '요약할 수 없습니다.';
      } catch (err) {
        return ['요약할 수 없습니다:', err instanceof Error ? err.message : '알 수 없는 오류'].join(
          ' ',
        );
      }
    },
  };
};
