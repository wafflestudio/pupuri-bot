import { type TeamService } from '../services/team';

export type TeamController = { sendPupuriTeamScrum: () => void };

type Deps = { services: [TeamService] };
export const getTeamController = ({ services: [teamService] }: Deps): TeamController => {
  return {
    sendPupuriTeamScrum: () => teamService.sendPupuriTeamScrum(),
  };
};
