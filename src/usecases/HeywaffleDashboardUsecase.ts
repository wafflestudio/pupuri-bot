import type { Log } from '../entities/Waffle';

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
    listAllLogs: () => Promise<{ logs: Log[] }>;
  };
  memberRepository: {
    getAllMembers: () => Promise<{ members: { slackUserId: string; name: string }[] }>;
  };
}): HeywaffleDashboardUsecase => {
  return {
    getGraphData: async () => {
      const { logs } = await waffleRepository.listAllLogs();
      const { members } = await memberRepository.getAllMembers();

      const vertexes = logs
        .reduce<{ user: string; given: number; taken: number }[]>((a, c) => {
          const foundGiver = a.find((it) => it.user === c.from);
          const foundReceiver = a.find((it) => it.user === c.to);

          if (foundGiver) foundGiver.given += c.count;
          else a.push({ user: c.from, given: c.count, taken: 0 });

          if (foundReceiver) foundReceiver.taken += c.count;
          else a.push({ user: c.to, given: 0, taken: c.count });

          return a;
        }, [])
        .map((d) => ({
          id: d.user,
          title: [
            members.find((m) => m.slackUserId === d.user)?.name ?? '-',
            `(${d.given + d.taken})`,
          ].join(' '),
          count: d.given + d.taken,
        }));

      const edges = logs.reduce(
        (
          acc: { from: string; to: string; count: number }[],
          cur,
        ): { from: string; to: string; count: number }[] => {
          const found = acc.find(
            (a) =>
              (a.from === cur.from && a.to === cur.to) || (a.from === cur.to && a.to === cur.from),
          );
          if (found) found.count += cur.count;
          else acc.push({ from: cur.from, to: cur.to, count: cur.count });
          return acc;
        },
        [],
      );

      return { vertexes, edges };
    },
  };
};
