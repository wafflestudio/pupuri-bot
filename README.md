![GitHub commit activity (branch)](https://img.shields.io/github/commit-activity/m/wafflestudio/pupuri-bot/main)
![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/wafflestudio/pupuri-bot)

# pupuri slack bot

## features

- slack watcher
- deploy watcher
- weekly dashboard

### slack watcher

- 와플스튜디오 슬랙에서 일어나는 채널 생성/삭제/이름변경/보관/보관취소 이벤트를 감지하여 `#slack-watcher` 채널로 알림을 보냅니다.

### deploy watcher

- release 를 생성하여 tag base 로 배포할 경우 `#deploy-watcher` 채널로 알림을 보냅니다.
- https://github.com/organizations/wafflestudio/settings/hooks/458839006 웹훅을 이용합니다.

### weekly dashboard

- 매주 월요일 아침 11시 20분에 지난 주 통계를 지정된 active 채널로 보냅니다.

### heywaffle

- 칭찬스티커로 와플을 줄 수 있습니다.
- https://cloud.mongodb.com/v2/67979f416121847ae5d10c2a#/overview

## setup

먼저 [`bun`](https://bun.sh/) 이 설치되어 있어야 합니다.

아래 환경변수들을 `.env.local` 에 세팅해주세요. 하드코딩된 채널의 경우 개인 DM으로 세팅하면 더 좋을 수 있습니다.

```env
SLACK_BOT_TOKEN=SVs...
SLACK_AUTH_TOKEN=xoxb-...
GHP_ACCESS_TOKEN=github_pat_...
SLACK_WATCHER_CHANNEL_ID=C051TJXA7UZ
DEPLOY_WATCHER_CHANNEL_ID=C051TJXA7UZ
SLACK_WEEKLY_CHANNEL_ID=C051TJXA7UZ
GITHUB_ORGANIZATION=wafflestudio
MONGODB_URI=mongodb+srv://...
TRUFFLE_API_KEY=...
```

서버를 띄우려면 아래와 같이 수행해주세요.

```bash
bun dev:server
```

weekly dashboard 전송을 테스트하려면 아래와 같이 수행해주세요.

```bash
bun send:weekly-dashboard
```

## deploy

서버를 배포하려면 [releases](https://github.com/wafflestudio/pupuri-bot/releases) 에서 기존 컨벤션에 맞게 릴리즈와 태그를 생성해 주세요.

weekly dashboard 는 github actions 로 수행되기에, main에 머지만 되었다면 별도의 배포가 필요하진 않습니다.
