export const handleSlackEvent = async (
  event: { type: string; channel: { id: string } },
  sendMessage: (text: string) => void
) => {
  const channelId = event.channel.id;
  switch (event.type) {
    case "channel_created":
      sendMessage(`<#${channelId}> 채널이 생성되었어요`);
      break;
    case "channel_archive":
      sendMessage(`<#${channelId}> 채널이 보관되었어요`);
      break;
    case "channel_unarchive":
      sendMessage(`<#${channelId}> 채널이 보관 해제되었어요`);
      break;
  }
};
