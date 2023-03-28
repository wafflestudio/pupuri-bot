export const handleSlackEvent = async (
  type: string,
  channel: { id: string },
  sendMessage: (text: string) => void
) => {
  switch (type) {
    case "channel_created":
      sendMessage(`<#${channel.id}> has created.`);
      break;
    case "channel_rename":
      sendMessage(`<#${channel.id}> has renamed.`);
      break;
    case "channel_archive":
      sendMessage(`<#${channel.id}> has archived.`);
      break;
    case "channel_unarchive":
      sendMessage(`<#${channel.id}> has unarchived.`);
      break;
  }
};
