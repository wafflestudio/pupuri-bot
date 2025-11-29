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
          else a.push({ given: c.count, taken: 0, user: c.from });

          if (foundReceiver) foundReceiver.taken += c.count;
          else a.push({ given: 0, taken: c.count, user: c.to });

          return a;
        }, [])
        .map((d) => ({
          count: d.given + d.taken,
          id: d.user,
          title: [
            members.find((m) => m.slackUserId === d.user)?.name ?? '-',
            `(${d.given + d.taken})`,
          ].join(' '),
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
          else acc.push({ count: cur.count, from: cur.from, to: cur.to });
          return acc;
        },
        [],
      );

      return { edges, vertexes };
    },
  };
};
