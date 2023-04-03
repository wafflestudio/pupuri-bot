export type LogService = {
  logEvent: (type: 'slack' | 'error', event: unknown) => void;
};

export const getLogService = (): LogService => {
  return {
    logEvent(type, event) {
      console.log('=-=-=-=-=-=-=-=-=-=');
      console.log(type);
      console.log(event);
      console.log('=-=-=-=-=-=-=-=-=-=');
    },
  };
};
