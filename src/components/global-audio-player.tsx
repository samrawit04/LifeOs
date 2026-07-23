import { useEffect, useRef, useState } from "react";
import { useMusicPlayer } from "@/lib/music-player-context";
import { useRouterState } from "@tanstack/react-router";

export function GlobalAudioPlayer() {
  const { currentVideo, isPlaying, next } = useMusicPlayer();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [slotRect, setSlotRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // YouTube postMessage API listener for autoplay next track
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("youtube.com")) return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "onStateChange" && data?.info === 0) {
          next();
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [next]);

  // Command YouTube iframe to play or pause when context isPlaying or currentVideo changes
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    const command = isPlaying ? "playVideo" : "pauseVideo";
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: [] }),
        "*"
      );
    } catch {
      // ignore
    }
  }, [isPlaying, currentVideo]);


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
        setSlotRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
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

  if (!currentVideo) return null;

  const iframeSrc = `https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  const isVisibleOnMusicPage =
    pathname === "/music" && slotRect && slotRect.width > 0 && slotRect.height > 0;

  return (
    <div
      style={
        isVisibleOnMusicPage
          ? {
              position: "fixed",
              top: `${slotRect.top}px`,
              left: `${slotRect.left}px`,
              width: `${slotRect.width}px`,
              height: `${slotRect.height}px`,
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
      <iframe
        ref={iframeRef}
        key={currentVideo.videoId}
        src={iframeSrc}
        title={currentVideo.title}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
