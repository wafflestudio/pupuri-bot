import { type DeployWebhookController } from '../controllers/DeployWebhookConrtoller';
import { Member } from '../entities/Member';
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
          author: GITHUB_ID_MEMBER_MAP[releaseBody.release.author.login],
          changes: releaseBody.release.body
            .split('\n')
            .reduce<{ content: string; author: Member | undefined }[]>((acc, cur) => {
              const match = cur.match(/\* (.*) by @(.*) in (.*)/);
              if (!match) return acc;
              return [...acc, { content: match[1], author: GITHUB_ID_MEMBER_MAP[match[2]] }];
            }, []),
          tag: releaseBody.release.tag_name,
          releaseUrl: releaseBody.release.html_url,
          repository: releaseBody.repository.name,
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

const GITHUB_ID_MEMBER_MAP: Record<string, Member | undefined> = {
  woohm402: Member.WOOHM402,
  JuTak97: Member.JUTAK97,
};
