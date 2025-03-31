import type { KnipConfig } from 'knip';

export default (): KnipConfig => {
  return {
    entry: ['src/server.ts', 'src/weekly-dashboard.ts', '**/*.test.ts'],
    ignoreBinaries: ['build', 'dist/server.js'],
  };
};
