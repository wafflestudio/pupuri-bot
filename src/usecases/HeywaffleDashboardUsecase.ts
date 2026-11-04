export type HeywaffleDashboardUsecase = {
  getGraphData: () => Promise<{
    vertexes: { id: string; count: number; title: string }[];
    edges: { from: string; to: string; count: number }[];
  }>;
};

export const getHeywaffleDashboardUsecase = ({
  waffleRepository,
  memberRepository,
}: {
  waffleRepository: {
    summarizeAllLogs: () => Promise<{
      vertexes: { user: string; given: number; taken: number }[];
      edges: { from: string; to: string; count: number }[];
    }>;
  };
  memberRepository: {
    getAllMembers: () => Promise<{ members: { slackUserId: string; name: string }[] }>;
  };
}): HeywaffleDashboardUsecase => {
  return {
    getGraphData: async () => {
      const { vertexes: summaries, edges } = await waffleRepository.summarizeAllLogs();
      const { members } = await memberRepository.getAllMembers();
      const memberNames = new Map(members.map((member) => [member.slackUserId, member.name]));

      const vertexes = summaries.map((d) => ({
        count: d.given + d.taken,
        id: d.user,
        title: [memberNames.get(d.user) ?? '-', `(${d.given + d.taken})`].join(' '),
      }));

      return { edges, vertexes };
    },
  };
};
