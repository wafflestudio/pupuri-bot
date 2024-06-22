export const getScore = ({ pullRequestCount, commentCount }: { pullRequestCount: number; commentCount: number }) => {
  return pullRequestCount * 5 + commentCount;
};
