import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  durationSeconds: number;
}

interface MusicPlayerState {
  currentVideo: VideoInfo | null;
  queue: VideoInfo[];
  currentIndex: number;
  isPlaying: boolean;
  isMiniPlayerVisible: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
}

interface MusicPlayerActions {
  play: (video: VideoInfo, queue?: VideoInfo[]) => void;
  playPlaylist: (videos: VideoInfo[], startIndex?: number) => void;
  next: () => void;
  prev: () => void;
  pause: () => void;
  resume: () => void;
  dismiss: () => void;
  addToQueue: (video: VideoInfo) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const MusicPlayerContext = createContext<
  (MusicPlayerState & MusicPlayerActions) | null
>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MusicPlayerState>({
    currentVideo: null,
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    isMiniPlayerVisible: false,
    isShuffle: false,
    isRepeat: false,
  });

  // Keep a stable ref so callbacks don't stale-close over state
  const stateRef = useRef(state);
  stateRef.current = state;

  const play = useCallback((video: VideoInfo, queue?: VideoInfo[], startIndex?: number) => {
    const q = queue ?? [video];
    const idx = typeof startIndex === "number" ? startIndex : q.findIndex((v) => v.videoId === video.videoId);
    setState((s) => ({
      ...s,
      currentVideo: video,
      queue: q,
      currentIndex: idx >= 0 ? idx : 0,
      isPlaying: true,
      isMiniPlayerVisible: true,
    }));
  }, []);

  const playPlaylist = useCallback(
    (videos: VideoInfo[], startIndex = 0) => {
      if (!videos.length) return;
      const validIdx = Math.max(0, Math.min(startIndex, videos.length - 1));
      play(videos[validIdx], videos, validIdx);
    },
    [play],
  );

  const next = useCallback(() => {
    const { queue, currentIndex, isShuffle, isRepeat } = stateRef.current;
    if (!queue.length) return;

    let nextIdx = currentIndex;

    if (isRepeat) {
      // Repeat current track: keep same index
    } else if (isShuffle && queue.length > 1) {
      // Choose random index different from current index
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === currentIndex);
    } else {
      // Normal sequential play
      nextIdx = (currentIndex + 1) % queue.length;
    }

    setState((s) => ({
      ...s,
      currentVideo: queue[nextIdx],
      currentIndex: nextIdx,
      isPlaying: true,
    }));
  }, []);

  const prev = useCallback(() => {
    const { queue, currentIndex, isShuffle, isRepeat } = stateRef.current;
    if (!queue.length) return;

    let prevIdx = currentIndex;

    if (isRepeat) {
      // Repeat current track
    } else if (isShuffle && queue.length > 1) {
      do {
        prevIdx = Math.floor(Math.random() * queue.length);
      } while (prevIdx === currentIndex);
    } else {
      prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    }

    setState((s) => ({
      ...s,
      currentVideo: queue[prevIdx],
      currentIndex: prevIdx,
      isPlaying: true,
    }));
  }, []);

  const pause = useCallback(
    () => setState((s) => ({ ...s, isPlaying: false })),
    [],
  );
  const resume = useCallback(
    () => setState((s) => ({ ...s, isPlaying: true })),
    [],
  );
  const dismiss = useCallback(
    () =>
      setState((s) => ({
        ...s,
        isPlaying: false,
        isMiniPlayerVisible: false,
      })),
    [],
  );
  const addToQueue = useCallback((video: VideoInfo) => {
    setState((s) => ({ ...s, queue: [...s.queue, video] }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((s) => ({ ...s, isShuffle: !s.isShuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((s) => ({ ...s, isRepeat: !s.isRepeat }));
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        ...state,
        play,
        playPlaylist,
        next,
        prev,
        pause,
        resume,
        dismiss,
        addToQueue,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error("useMusicPlayer must be inside MusicPlayerProvider");
  return ctx;
}
