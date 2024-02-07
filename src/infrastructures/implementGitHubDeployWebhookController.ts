import { type DeployWebhookController } from '../controllers/DeployWebhookConrtoller';
import { type Member, members } from '../entities/Member';
import { type GithubDeploymentService } from '../services/GithubDeploymentService';

type ReleaseBody = {
  release: { author: { login: string }; body: string; tag_name: string; html_url: string };
  repository: { name: string };
};

type WorkflowRunBody = {
  workflow_run: { name: string; head_branch: string; id: number; html_url: string };
  repository: { name: string };
};

export const implementGitHubDeployWebhookController = ({
  deploymentService,
}: {
  deploymentService: GithubDeploymentService;
}): DeployWebhookController => {
  return {
    handle: (body) => {
      if (!body || typeof body !== 'object' || !('action' in body)) throw new Error('400');

      if ('release' in body && body.action === 'released') {
        const releaseBody = body as unknown as ReleaseBody;

        return deploymentService.handleCreateRelease({
          author: findMemberByGithubUsername(releaseBody.release.author.login),
          tag: releaseBody.release.tag_name,
          releaseUrl: releaseBody.release.html_url,
          repository: releaseBody.repository.name,
          releaseNote: releaseBody.release.body,
          otherContributors: [],
        });
      }

      if ('workflow_run' in body) {
        const workflowRunBody = body as unknown as WorkflowRunBody;

        const params = {
          workflowName: workflowRunBody.workflow_run.name,
          tag: workflowRunBody.workflow_run.head_branch,
          repository: workflowRunBody.repository.name,
          workflowId: workflowRunBody.workflow_run.id,
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

const findMemberByGithubUsername = (username: string): Member | undefined => {
  const found = members.find((member) => member === username);
  return found;
};
