import { useMusicPlayer } from "@/lib/music-player-context";
import { Link } from "@tanstack/react-router";
import { Play, Pause, SkipBack, SkipForward, X, Music2 } from "lucide-react";

export function MiniPlayer() {
  const { currentVideo, isPlaying, isMiniPlayerVisible, pause, resume, next, prev, dismiss } =
    useMusicPlayer();

  if (!isMiniPlayerVisible || !currentVideo) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-sidebar/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        {/* Thumbnail */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
          {currentVideo.thumbnail ? (
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {/* subtle pulse ring while playing */}
          {isPlaying && (
            <span className="absolute inset-0 rounded-lg ring-2 ring-primary/60 animate-pulse" />
          )}
        </div>

        {/* Title + channel */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground leading-tight">
            {currentVideo.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {currentVideo.channelName}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={isPlaying ? pause : resume}
            className="grid h-9 w-9 place-items-center rounded-xl bg-primary/20 text-primary transition hover:bg-primary/30"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-0.5" />
            )}
          </button>
          <button
            onClick={next}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Go to music page */}
        <Link
          to="/music"
          className="hidden shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary sm:block"
        >
          Open Player →
        </Link>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          aria-label="Dismiss player"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
