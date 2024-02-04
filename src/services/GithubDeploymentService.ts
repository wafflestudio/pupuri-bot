import { type Member } from '../entities/Member';

export type GithubDeploymentService = {
  handleCreateRelease: (body: {
    author: Member | undefined;
    changes: { author: Member | undefined; content: string }[];
    tag: string;
    releaseUrl: string;
    repository: string;
  }) => Promise<void>;
  handleActionStart: (body: {
    workflowName: string;
    tag: string;
    repository: string;
    workflowId: number;
    workflowUrl: string;
  }) => Promise<void>;
  handleActionComplete: (body: {
    workflowName: string;
    tag: string;
    repository: string;
    workflowId: number;
    workflowUrl: string;
  }) => Promise<void>;
};
