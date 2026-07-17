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
  });

  // Stable ref so callbacks don't stale-close over state
  const stateRef = useRef(state);
  stateRef.current = state;

  const play = useCallback((video: VideoInfo, queue?: VideoInfo[]) => {
    const q = queue ?? [video];
    const idx = q.findIndex((v) => v.videoId === video.videoId);
    setState({
      currentVideo: video,
      queue: q,
      currentIndex: idx >= 0 ? idx : 0,
      isPlaying: true,
      isMiniPlayerVisible: true,
    });
  }, []);

  const playPlaylist = useCallback(
    (videos: VideoInfo[], startIndex = 0) => {
      if (!videos.length) return;
      play(videos[startIndex], videos);
    },
    [play],
  );

  const next = useCallback(() => {
    const { queue, currentIndex } = stateRef.current;
    if (!queue.length) return;
    const nextIdx = (currentIndex + 1) % queue.length;
    setState((s) => ({
      ...s,
      currentVideo: queue[nextIdx],
      currentIndex: nextIdx,
      isPlaying: true,
    }));
  }, []);

  const prev = useCallback(() => {
    const { queue, currentIndex } = stateRef.current;
    if (!queue.length) return;
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
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

  return (
    <MusicPlayerContext.Provider
      value={{ ...state, play, playPlaylist, next, prev, pause, resume, dismiss, addToQueue }}
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
