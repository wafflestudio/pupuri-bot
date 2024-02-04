export type GithubDeploymentService = {
  handleCreateRelease: (body: {
    release: { author: { login: string }; body: string; tag_name: string; html_url: string };
    repository: { name: string };
  }) => Promise<void>;
  handleActionStart: (body: WorkflowRunBody) => Promise<void>;
  handleActionComplete: (body: WorkflowRunBody) => Promise<void>;
};

type WorkflowRunBody = {
  workflow_run: { name: string; head_branch: string; id: number; html_url: string };
  repository: { name: string };
};
