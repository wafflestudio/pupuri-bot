import { type SlackClient } from '../clients/SlackClient';
import { Repository } from '../entities/GitHub';
import { type GithubApiRepository } from '../repositories/GithubApiRepository';
import { type DashboardService } from '../services/DashboardService';

export const implementDashboardService = ({
  githubApiRepository,
  slackClient,
}: {
  githubApiRepository: GithubApiRepository;
  slackClient: SlackClient;
}): DashboardService => {
  return {
    sendGithubTopRepositoriesLastWeek: async (organization: string) => {
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories(organization, {
        sort: 'pushed',
        perPage: 30,
      });
      const repoWithDetails = await Promise.all(
        repos.map(async (repo) => {
          const recentMergedPullRequests = (
            await githubApiRepository.listRepositoryPullRequests(organization, repo.name, {
              perPage: 100,
              sort: 'updated',
              state: 'closed',
              direction: 'desc',
            })
          ).filter((pr) => pr.merged_at && new Date(pr.merged_at) > aWeekAgo);

          const recentCreatedComments = (
            await githubApiRepository.listRepositoryComments(organization, repo.name, {
              perPage: 100,
              sort: 'created_at',
              direction: 'desc',
            })
          ).filter((c) => new Date(c.created_at) > aWeekAgo);

          const score = recentMergedPullRequests.length * 5 + recentCreatedComments.length * 1;

          if (score === 0) return [];

          return [
            {
              repository: repo,
              score,
              details: {
                pullRequestCount: recentMergedPullRequests.length,
                commentCount: recentCreatedComments.length,
              },
            },
          ];
        }),
      );

      const topRepositories = repoWithDetails.flat().sort((a, b) => b.score - a.score);
      const topRepositoriesLength = 5;

      const data = topRepositories.slice(0, topRepositoriesLength);
      const divider = '---------------------------------------------';
      const title = `*:github: Top ${topRepositoriesLength} Repositories Last Week* :blob-clap:`;
      const maxPointStringLength = `${Math.max(...data.map((item) => item.score))}`.length;
      const repositories = data
        .map(({ repository: { html_url, name }, score, details: { commentCount, pullRequestCount } }, i) => {
          const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
          return `${rankEmojis[i]} [${scoreString}p] <${html_url}|*${name}*> (${pullRequestCount} pull requests, ${commentCount} comments)`;
        })
        .join('\n\n');
      await slackClient.sendMessage([divider, title, divider, repositories].join('\n'));
    },
    sendGithubTopRepositoriesPerTeamLastThreeDays: async (organization: string) => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories(organization, {
        sort: 'pushed',
        perPage: 30,
      });
      
      const reposGroupByTeam = new Map<number, { teamNumber :number, serverRepo: Repository | undefined, clientRepo: Repository | undefined }>();
      repos.forEach((repo) => {
        console.log(repo.name);
        const extractedNumbers = repo.name.match(/\d+/);
        if (extractedNumbers) {
          const teamNumber = parseInt(extractedNumbers[0], 10);
          const isServer = repo.name.endsWith("server");
          
          const data = reposGroupByTeam.has(teamNumber) ? reposGroupByTeam.get(teamNumber)! : { teamNumber: teamNumber, serverRepo: undefined, clientRepo: undefined };
          if (isServer) {
            data.serverRepo = repo;
          } else {
            data.clientRepo = repo;
          }
          reposGroupByTeam.set(teamNumber, data);
        }
      });

      console.log(reposGroupByTeam.size);
      

      const repoWithDetails = await Promise.all(
        Array.from(reposGroupByTeam.values()).map(async ({teamNumber, serverRepo, clientRepo}) => {
          if (!serverRepo || !clientRepo) return [];

          const recentMergedPullRequests = (
            (await githubApiRepository.listRepositoryPullRequests(organization, serverRepo.name, {
              perPage: 100,
              sort: 'updated',
              state: 'closed',
              direction: 'desc',
            })).concat(
              await githubApiRepository.listRepositoryPullRequests(organization, clientRepo.name, {
                perPage: 100,
                sort: 'updated',
                state: 'closed',
                direction: 'desc',
              }) 
            )
          ).filter((pr) => pr.merged_at && new Date(pr.merged_at) > threeDaysAgo);

          const recentCreatedComments = (
            (await githubApiRepository.listRepositoryComments(organization, serverRepo.name, {
              perPage: 100,
              sort: 'created_at',
              direction: 'desc',
            })).concat(
              await githubApiRepository.listRepositoryComments(organization, clientRepo.name, {
                perPage: 100,
                sort: 'created_at',
                direction: 'desc',
              })
            )
          ).filter((c) => new Date(c.created_at) > threeDaysAgo);

          const score = recentMergedPullRequests.length * 5 + recentCreatedComments.length * 1;

          if (score === 0) return [];

          return [
            {
              serverRepo: serverRepo,
              clientRepo: clientRepo,
              teamName: `team${teamNumber}`,
              score,
              details: {
                pullRequestCount: recentMergedPullRequests.length,
                commentCount: recentCreatedComments.length,
              },
            },
          ];
        }),
      );

      const topRepositories = repoWithDetails.flat().sort((a, b) => b.score - a.score);
      const topRepositoriesLength = 3;

      const data = topRepositories.slice(0, topRepositoriesLength);
      const divider = '---------------------------------------------';
      const title = `*:github: Top ${topRepositoriesLength} Teams Last 3 Days* :blob-clap:`;
      const maxPointStringLength = `${Math.max(...data.map((item) => item.score))}`.length;

      const repositories = data
        .map(({ teamName, serverRepo: { html_url : server_html_url, name: server_name }, clientRepo: { html_url: client_html_url, name: client_name }, score, details: { commentCount, pullRequestCount } }, i) => {
          const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
          const serverEmoji = (server_name[4] == '2' || server_name[4] == '3' || server_name[4] == '5') ? ':spring:' : ':django:';
          let clientEmoji: string;
          if (client_name[4] == '1') clientEmoji = ":apple_mac:";
          else if (client_name[4] == '2' || client_name[4] == '3' || client_name[4] == '4') clientEmoji = ":android:";
          else  clientEmoji = ":react:";
          return `${rankEmojis[i]} [${scoreString}p] *${teamName}* (${pullRequestCount} pull requests, ${commentCount} comments)\n\n\t\t${serverEmoji} <${server_html_url}|*${server_name}*>\t${clientEmoji} <${client_html_url}|*${client_name}*>`;
        })
        .join('\n\n');
      await slackClient.sendMessage([divider, title, divider, repositories].join('\n'));
    },
  };
};

const rankEmojis = [':first_place_medal:', ':second_place_medal:', ':third_place_medal:', ':four:', ':five:'];
