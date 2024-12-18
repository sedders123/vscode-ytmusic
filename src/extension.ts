import { commands, ExtensionContext } from "vscode";
import YouTubeMusic from "./youtubeMusic";

export function activate(context: ExtensionContext) {
  let ytMusic = new YouTubeMusic(context);

  const playPauseCommand = commands.registerCommand(
    "ytMusic.playPause",
    async () => {
      await ytMusic.togglePlay();
    }
  );
  const skipCommand = commands.registerCommand("ytMusic.skip", async () => {
    await ytMusic.next();
  });
  const rewindCommand = commands.registerCommand("ytMusic.rewind", async () => {
    await ytMusic.previous();
  });
  const cycleRepeatCommand = commands.registerCommand(
    "ytMusic.cycleRepeat",
    async () => {
      await ytMusic.cycleRepeat();
    }
  );
  const restartCommand = commands.registerCommand("ytMusic.restart", () => {
    ytMusic.dispose();
    ytMusic = new YouTubeMusic(context);
  });

  const authCommand = commands.registerCommand("ytMusic.auth", async () => {
    await ytMusic.auth();
  });

  const thumbsUpCommand = commands.registerCommand(
    "ytMusic.thumbsUp",
    async () => {
      await ytMusic.thumbsUp();
    }
  );

  const thumbsDownCommand = commands.registerCommand(
    "ytMusic.thumbsDown",
    async () => {
      await ytMusic.thumbsDown();
    }
  );

  context.subscriptions.push(playPauseCommand);
  context.subscriptions.push(skipCommand);
  context.subscriptions.push(rewindCommand);
  context.subscriptions.push(restartCommand);
  context.subscriptions.push(cycleRepeatCommand);
  context.subscriptions.push(authCommand);
  context.subscriptions.push(thumbsUpCommand);
  context.subscriptions.push(thumbsDownCommand);
  context.subscriptions.push(ytMusic);
}
