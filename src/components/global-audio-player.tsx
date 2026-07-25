import { useEffect, useRef, useState } from "react";
import { useMusicPlayer } from "@/lib/music-player-context";
import { useRouterState } from "@tanstack/react-router";

// Augment Window to include YT types
declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          width?: number | string;
          height?: number | string;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(videoId: string): void;
  getIframe?(): HTMLIFrameElement;
  destroy(): void;
}

let ytApiLoading = false;
let ytApiLoaded = false;
const ytReadyCallbacks: Array<() => void> = [];

function loadYouTubeApi(onReady: () => void) {
  if (ytApiLoaded) { onReady(); return; }
  ytReadyCallbacks.push(onReady);
  if (ytApiLoading) return;
  ytApiLoading = true;

  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    ytApiLoading = false;
    if (prev) prev();
    ytReadyCallbacks.forEach((cb) => cb());
    ytReadyCallbacks.length = 0;
  };

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

export function GlobalAudioPlayer() {
  const { currentVideo, isPlaying, next } = useMusicPlayer();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const playerRef = useRef<YTPlayer | null>(null);
  const playerDivId = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
  const currentVideoIdRef = useRef<string | null>(null);
  // Queues a video that was requested before the player finished initializing
  const pendingVideoRef = useRef<string | null>(null);
  const nextRef = useRef(next);
  nextRef.current = next;
  const [isReady, setIsReady] = useState(false);
  const [slotRect, setSlotRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Create the YT.Player once on mount — with NO initial videoId so it starts
  // as a blank white player rather than a black broken one.
  useEffect(() => {
    let destroyed = false;

    loadYouTubeApi(() => {
      if (destroyed) return;

      new window.YT.Player(playerDivId.current, {
        width: "100%",
        height: "100%",
        // Intentionally no videoId — prevents the broken black-screen init
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            playerRef.current = e.target;
            // Style the generated iframe to fill its container
            const container = document.getElementById(playerDivId.current);
            const iframe = container?.querySelector("iframe");
            if (iframe) {
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.border = "none";
              iframe.style.display = "block";
            }
            // Play any video that was requested before the player was ready
            if (pendingVideoRef.current) {
              currentVideoIdRef.current = pendingVideoRef.current;
              e.target.loadVideoById(pendingVideoRef.current);
              pendingVideoRef.current = null;
            }
          },
          onStateChange: (e) => {
            // 0 = ENDED
            if (e.data === 0) {
              nextRef.current();
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once

  // Load new video or play/pause when state changes or player becomes ready
  useEffect(() => {
    if (!currentVideo) return;

    if (!playerRef.current) {
      // Player not ready yet — queue the video so onReady picks it up
      pendingVideoRef.current = currentVideo.videoId;
      return;
    }

    if (currentVideoIdRef.current !== currentVideo.videoId) {
      // New video — load it (autoplay happens automatically via loadVideoById)
      currentVideoIdRef.current = currentVideo.videoId;
      if (typeof playerRef.current.loadVideoById === "function") {
        playerRef.current.loadVideoById(currentVideo.videoId);
      }
    }

    if (isPlaying) {
      if (typeof playerRef.current.playVideo === "function") {
        try { playerRef.current.playVideo(); } catch { /* ignore */ }
      }
    } else {
      if (typeof playerRef.current.pauseVideo === "function") {
        try { playerRef.current.pauseVideo(); } catch { /* ignore */ }
      }
    }
  }, [currentVideo, isPlaying, isReady]);

  // Track position of #music-player-slot on /music page
  useEffect(() => {
    if (pathname !== "/music") {
      setSlotRect(null);
      return;
    }

    const updateRect = () => {
      const slot = document.getElementById("music-player-slot");
      if (slot) {
        const rect = slot.getBoundingClientRect();
        setSlotRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      } else {
        setSlotRect(null);
      }
    };

    updateRect();
    const timer = setInterval(updateRect, 100);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [pathname]);

  // Re-measure immediately when a new video starts (the slot may have
  // just appeared in the DOM for the first time)
  useEffect(() => {
    if (pathname !== "/music" || !currentVideo) return;
    const slot = document.getElementById("music-player-slot");
    if (slot) {
      const rect = slot.getBoundingClientRect();
      setSlotRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
  }, [currentVideo, pathname]);

  const isVisibleOnMusicPage =
    pathname === "/music" && currentVideo && slotRect && slotRect.width > 0 && slotRect.height > 0;

  return (
    <div
      style={
        isVisibleOnMusicPage
          ? {
            position: "fixed",
            top: `${slotRect!.top}px`,
            left: `${slotRect!.left}px`,
            width: `${slotRect!.width}px`,
            height: `${slotRect!.height}px`,
            zIndex: 25,
            pointerEvents: "auto",
            borderRadius: "1rem",
            overflow: "hidden",
          }
          : {
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "1px",
            height: "1px",
            opacity: 0.001,
            pointerEvents: "none",
            zIndex: -1,
          }
      }
    >
      {/* YT.Player mounts inside this div — always in DOM so the player ref stays alive */}
      <div
        id={playerDivId.current}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
