// 와플 정책상 유저의 식별자로는 github username 을 이용한다.
export const members = ['woohm402', 'JuTaK97', 'peng-u-0807'] as const;

export type Member = (typeof members)[number];
