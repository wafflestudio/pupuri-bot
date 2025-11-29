import type { DeployWebhookController } from '../controllers/DeployWebhookConrtoller';
import type { DeplyWatcherUsecase } from '../usecases/DeployWatcherUsecase';

type ReleaseBody = {
  release: {
    author: { login: string };
    body: string;
    tag_name: string;
    html_url: string;
  };
  repository: { name: string };
};

type WorkflowRunBody = {
  workflow_run: {
    name: string;
    head_branch: string;
    id: number;
    html_url: string;
  };
  repository: { name: string };
};

export const implementGitHubDeployWebhookController = ({
  deploymentService,
}: {
  deploymentService: DeplyWatcherUsecase;
}): DeployWebhookController => {
  return {
    handle: (body) => {
      if (body === null || typeof body !== 'object' || !('action' in body)) throw new Error('400');

      if ('release' in body && body.action === 'released') {
        const releaseBody = body as unknown as ReleaseBody;

        return deploymentService.handleCreateRelease({
          authorGithubUsername: releaseBody.release.author.login,
          releaseNote: releaseBody.release.body,
          releaseUrl: releaseBody.release.html_url,
          repository: releaseBody.repository.name,
          tag: releaseBody.release.tag_name,
        });
      }

      if ('workflow_run' in body) {
        const workflowRunBody = body as unknown as WorkflowRunBody;

        const params = {
          repository: workflowRunBody.repository.name,
          tag: workflowRunBody.workflow_run.head_branch,
          workflowId: workflowRunBody.workflow_run.id,
          workflowName: workflowRunBody.workflow_run.name,
          workflowUrl: workflowRunBody.workflow_run.html_url,
        };

        return body.action === 'requested'
          ? deploymentService.handleActionStart(params)
          : body.action === 'completed'
            ? deploymentService.handleActionComplete(params)
            : null;
      }
    },
  };
};
