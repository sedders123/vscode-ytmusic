import { commands, ExtensionContext } from "vscode";
import YouTubeMusic from "./youtubeMusic";

export function activate(context: ExtensionContext) {
  let ytMusic = new YouTubeMusic(context);

  const playpauseCommand = commands.registerCommand("ytMusic.playpause", () => {
    ytMusic.togglePlay();
  });
  const skipCommand = commands.registerCommand("ytMusic.skip", () => {
    ytMusic.forward();
  });
  const rewindCommand = commands.registerCommand("ytMusic.rewind", () => {
    ytMusic.rewind();
  });
  const cycleRepeatCommand = commands.registerCommand(
    "ytMusic.cycleRepeat",
    () => {
      ytMusic.cycleRepeat();
    }
  );
  const restartCommand = commands.registerCommand("ytMusic.restart", () => {
    ytMusic.dispose();
    ytMusic = new YouTubeMusic(context);
  });

  context.subscriptions.push(playpauseCommand);
  context.subscriptions.push(skipCommand);
  context.subscriptions.push(rewindCommand);
  context.subscriptions.push(restartCommand);
  context.subscriptions.push(cycleRepeatCommand);
  context.subscriptions.push(ytMusic);
}
