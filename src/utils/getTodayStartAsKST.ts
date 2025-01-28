export const getTodayStartAsKST = (now: Date): Date => {
  const currentOffset = now.getTimezoneOffset() / 60;

  const offset = (-9 - currentOffset) * 60 * 60 * 1000;

  const temp = new Date(now.getTime() - offset);
  temp.setHours(0, 0, 0, 0);
  return new Date(temp.getTime() + offset);
};
