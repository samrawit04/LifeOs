import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMusicPlayer, type VideoInfo } from "@/lib/music-player-context";
import { apiClient, type Playlist, type PlaylistItem } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Plus,
  Trash2,
  ListMusic,
  Search,
  ChevronUp,
  ChevronDown,
  Music2,
  ExternalLink,
  AlertCircle,
  Check,
  X,
  FolderPlus,
  Radio,
  ThumbsUp,
  Sparkles,
  ListOrdered,
  Shuffle,
  Repeat,
  Compass,
  Headphones,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/music")({
  component: MusicPage,
  head: () => ({
    meta: [
      { title: "Music & Focus · LifePulse" },
      { name: "description", content: "Ambient music player and focus playlist manager." },
    ],
  }),
});

const PRESETS: VideoInfo[] = [
  {
    videoId: "jfKfPfyJRdk",
    title: "lofi hip hop radio 📚 beats to study/relax to",
    channelName: "Lofi Girl",
    thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    durationSeconds: 0,
  },
  {
    videoId: "5qap5aO4i9A",
    title: "lofi hip hop radio 💤 beats to sleep/chill to",
    channelName: "Lofi Girl",
    thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg",
    durationSeconds: 0,
  },
  {
    videoId: "vF5L-pMmsr0",
    title: "Coffee Shop Ambience ☕ Smooth Jazz & Rain Sounds",
    channelName: "Cafe Music BGM channel",
    thumbnail: "https://img.youtube.com/vi/vF5L-pMmsr0/hqdefault.jpg",
    durationSeconds: 10800,
  },
  {
    videoId: "4xDzrJKXOOY",
    title: "synthwave radio 🌌 beats to chill/game to",
    channelName: "Lofi Girl",
    thumbnail: "https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg",
    durationSeconds: 0,
  },
  {
    videoId: "mPZkdNFkNps",
    title: "Cozy Rain & Thunderstorm ⛈️ Sleep, Study, Relaxing Ambience",
    channelName: "Rainstorm Ambience",
    thumbnail: "https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg",
    durationSeconds: 28800,
  },
];

const DEFAULT_QUICK_WORDS = [
  "Lofi Hip Hop",
  "Jazz Rain Ambience",
  "Deep Focus Techno",
  "coders music",
  "holy song ethiopia",
  "podcasts"
];

// ─── Add-to-playlist portal popover ──────────────────────────────────────────
function AddToPlaylistButton({
  video,
  playlists,
  onAdd,
  variant = "icon",
}: {
  video: VideoInfo;
  playlists: Playlist[];
  onAdd: (video: VideoInfo, playlistId: string) => void;
  variant?: "icon" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right });
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t) && menuRef.current && !menuRef.current.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener("scroll", h, true);
    return () => window.removeEventListener("scroll", h, true);
  }, [open]);

  const pillCls = "flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-primary/20 hover:border-primary/40 hover:text-primary transition";
  const iconCls = "grid h-8 w-8 place-items-center rounded-full bg-white/5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition";

  if (playlists.length === 0) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); toast.error("Create a playlist first!"); }}
        className={variant === "pill" ? pillCls : iconCls}
        title="Add to playlist"
      >
        <Plus className="h-4 w-4" />
        {variant === "pill" && <span>Save to Playlist</span>}
      </button>
    );
  }

  return (
    <>
      <button ref={btnRef} onClick={openMenu} className={variant === "pill" ? pillCls : iconCls} title="Add to playlist">
        <Plus className="h-4 w-4" />
        {variant === "pill" && <span>Save to Playlist</span>}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: "absolute", top: coords.top, right: coords.right, zIndex: 9999 }}
          className="w-56 rounded-2xl border border-white/10 bg-sidebar/95 p-1.5 shadow-2xl overflow-hidden backdrop-blur-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="border-b border-white/5 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Save to playlist</span>
            <X className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setOpen(false)} />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); onAdd(video, p.id); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10 transition group"
              >
                <ListMusic className="h-4 w-4 shrink-0 text-primary group-hover:scale-110 transition" />
                <span className="flex-1 truncate text-foreground/90 font-medium">{p.name}</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">{p.itemCount ?? 0}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({
  video,
  isActive,
  isPlaying,
  playlists,
  onPlay,
  onAdd,
  badge,
}: {
  video: VideoInfo;
  isActive: boolean;
  isPlaying: boolean;
  playlists: Playlist[];
  onPlay: () => void;
  onAdd: (v: VideoInfo, pid: string) => void;
  badge?: string;
}) {
  return (
    <div
      onClick={onPlay}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border transition cursor-pointer glass-card hover:border-primary/40",
        isActive ? "border-primary/60 ring-1 ring-primary/40" : "border-white/5"
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black/60">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/90 text-primary-foreground shadow-xl">
            {isActive && isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current translate-x-0.5" />}
          </div>
        </div>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {video.durationSeconds > 0 ? `${Math.floor(video.durationSeconds / 60)}m` : "LIVE"}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <h3
            className={cn("line-clamp-2 text-sm font-medium leading-snug", isActive ? "text-primary font-semibold" : "text-foreground")}
            dangerouslySetInnerHTML={{ __html: video.title }}
          />
          <p className="mt-1 truncate text-xs text-muted-foreground">{video.channelName}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Compass className="h-3 w-3" /> {badge ?? "YouTube Stream"}
          </span>
          <AddToPlaylistButton video={video} playlists={playlists} onAdd={onAdd} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Music Page ──────────────────────────────────────────────────────────
function MusicPage() {
  const {
    currentVideo, isPlaying, play, next, playPlaylist, queue,
    isShuffle, isRepeat, toggleShuffle, toggleRepeat
  } = useMusicPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"player" | "search" | "curated">("player");
  const [liked, setLiked] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Editable Quick Search Suggestions
  const [quickWords, setQuickWords] = useState<string[]>([]);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWordInput, setNewWordInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("lifepulse.music.quickwords");
    if (saved) {
      try {
        setQuickWords(JSON.parse(saved));
      } catch {
        setQuickWords(DEFAULT_QUICK_WORDS);
      }
    } else {
      setQuickWords(DEFAULT_QUICK_WORDS);
    }
  }, []);

  const saveQuickWords = (newWords: string[]) => {
    setQuickWords(newWords);
    localStorage.setItem("lifepulse.music.quickwords", JSON.stringify(newWords));
  };

  const addQuickWord = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    if (quickWords.includes(trimmed)) {
      toast.info("This quick suggestion already exists!");
      return;
    }
    saveQuickWords([...quickWords, trimmed]);
  };

  const removeQuickWord = (wordToRemove: string) => {
    saveQuickWords(quickWords.filter((w) => w !== wordToRemove));
  };

  const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY || "";


  useEffect(() => { loadPlaylists(); }, []);

  useEffect(() => {
    if (selectedPlaylist) loadPlaylistItems(selectedPlaylist.id);
    else setPlaylistItems([]);
  }, [selectedPlaylist]);

  const loadPlaylists = async () => {
    try {
      const data = await apiClient.playlists.getAll();
      setPlaylists(data);
      if (data.length > 0 && !selectedPlaylist) setSelectedPlaylist(data[0]);
    } catch { toast.error("Failed to load playlists"); }
  };

  const loadPlaylistItems = async (id: string) => {
    try {
      const data = await apiClient.playlists.getItems(id);
      setPlaylistItems(data);
    } catch { toast.error("Failed to load playlist items"); }
  };

  const handleCreatePlaylist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const created = await apiClient.playlists.create(newPlaylistName.trim());
      setPlaylists((prev) => [created, ...prev]);
      setSelectedPlaylist(created);
      setNewPlaylistName("");
      setShowCreateModal(false);
      toast.success(`Playlist "${created.name}" created!`);
    } catch (err) {
      console.error("Failed to create playlist:", err);
      toast.error("Failed to create playlist");
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await apiClient.playlists.delete(id);
      const remaining = playlists.filter((p) => p.id !== id);
      setPlaylists(remaining);
      if (selectedPlaylist?.id === id) setSelectedPlaylist(remaining[0] ?? null);
      toast.success("Playlist deleted");
    } catch (err) {
      console.error("Failed to delete playlist:", err);
      toast.error("Failed to delete playlist");
    }
  };

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch ?? searchQuery).trim();
    if (!q) return;
    if (!youtubeApiKey) { toast.error("Set VITE_YOUTUBE_API_KEY to enable search."); return; }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&key=${youtubeApiKey}&maxResults=12`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSearchResults(
        data.items.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
          durationSeconds: 0,
        }))
      );
      setActiveMainTab("search");
    } catch { toast.error("YouTube search failed"); }
    finally { setIsSearching(false); }
  };

  const handlePlayTrack = (video: VideoInfo) => {
    play(video);
    setActiveMainTab("player");
  };

  const handlePlayPlaylistItem = (index: number) => {
    if (!playlistItems.length) return;
    const queueVideos: VideoInfo[] = playlistItems.map((item) => ({
      videoId: item.videoId,
      title: item.title,
      channelName: item.channelName,
      thumbnail: item.thumbnail,
      durationSeconds: item.durationSeconds,
    }));
    playPlaylist(queueVideos, index);
    setActiveMainTab("player");
  };

  const handleAddToPlaylist = async (video: VideoInfo, playlistId: string) => {
    if (selectedPlaylist?.id === playlistId && playlistItems.some((i) => i.videoId === video.videoId)) {
      toast.info("This song is already in this playlist!");
      return;
    }
    try {
      await apiClient.playlists.addItem(playlistId, video);
      if (selectedPlaylist?.id === playlistId) loadPlaylistItems(playlistId);
      setPlaylists((prev) => prev.map((p) => p.id === playlistId ? { ...p, itemCount: (p.itemCount ?? 0) + 1 } : p));
      toast.success("Added to playlist!");
    } catch (e) {
      console.error("handleAddToPlaylist failed", e);
      toast.info("This song is already in this playlist!");
    }
  };

  const handleRemoveFromPlaylist = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedPlaylist) return;
    try {
      await apiClient.playlists.removeItem(selectedPlaylist.id, itemId);
      setPlaylistItems((prev) => prev.filter((i) => i.id !== itemId));
      setPlaylists((prev) => prev.map((p) => p.id === selectedPlaylist.id ? { ...p, itemCount: Math.max(0, (p.itemCount ?? 1) - 1) } : p));
      toast.success("Removed from playlist");
    } catch (err) {
      console.error("Failed to remove track:", err);
      toast.error("Failed to remove track");
    }
  };

  const handleMoveItem = async (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedPlaylist) return;
    const newItems = [...playlistItems];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    setPlaylistItems(newItems);
    try {
      await apiClient.playlists.reorderItems(selectedPlaylist.id, newItems.map((item, idx) => ({ id: item.id, position: idx })));
    } catch (err) {
      console.error("Failed to reorder:", err);
      toast.error("Failed to reorder");
      loadPlaylistItems(selectedPlaylist.id);
    }
  };

  const playEntirePlaylist = () => {
    handlePlayPlaylistItem(0);
  };


  const iframeSrc = currentVideo
    ? `https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : null;

  return (
    <div className="min-h-screen bg-cozy-grain text-foreground pb-12">

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4 bg-background/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent font-bold text-primary-foreground shadow-md shrink-0">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl sm:text-3xl font-bold text-gradient-primary">Music & Focus</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">LifePulse Soundscape</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="md:hidden rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold gap-1.5 shadow-sm shrink-0"
          >
            <FolderPlus className="h-3.5 w-3.5" /> <span className="hidden xs:inline">New Playlist</span>
          </Button>
        </div>

        {/* Search Bar — takes full width on mobile so input text is spacious & readable */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex w-full md:flex-1 md:max-w-2xl md:mx-4 items-center"
        >
          <div className="relative flex flex-1 items-center min-w-0">
            <Search className="absolute left-3 text-muted-foreground h-4 w-4 pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="Search YouTube music, artists, lofi, rain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-l-xl border border-white/10 bg-white/[0.04] pl-9 pr-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSearching}
            className="h-10 rounded-r-xl rounded-l-none border border-l-0 border-white/10 bg-primary/20 px-4 sm:px-5 text-primary hover:bg-primary/30 transition disabled:opacity-50 shrink-0"
          >
            {isSearching
              ? <span className="h-4 w-4 rounded-full border-2 border-primary border-r-transparent animate-spin" />
              : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="hidden md:flex rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold gap-1.5 shadow-sm shrink-0"
        >
          <FolderPlus className="h-3.5 w-3.5" /> New Playlist
        </Button>
      </header>

      {/* ── Quick Search Chips ── */}
      <div className="flex items-center gap-2 overflow-x-auto px-6 py-3 border-b border-white/5 scrollbar-none">
        <span className="text-xs font-medium text-muted-foreground mr-2 shrink-0">
          Quick:
        </span>
        {quickWords.map((tag) => (
          <span
            key={tag}
            className={cn(
              "flex items-center gap-1 shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
              searchQuery === tag
                ? "border-primary/40 bg-primary/20 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
            )}
          >
            <button
              onClick={() => { setSearchQuery(tag); handleSearch(tag); }}
              className="whitespace-nowrap hover:text-primary transition"
            >
              {tag}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeQuickWord(tag);
              }}
              className="ml-1 rounded-full p-0.5 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
              title={`Remove "${tag}"`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Inline Add Form */}
        {isAddingWord ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addQuickWord(newWordInput);
              setNewWordInput("");
              setIsAddingWord(false);
            }}
            className="flex items-center gap-1.5 shrink-0 rounded-full border border-primary/30 bg-white/5 px-2.5 py-0.5"
          >
            <input
              type="text"
              value={newWordInput}
              onChange={(e) => setNewWordInput(e.target.value)}
              placeholder="New quick tag..."
              className="bg-transparent border-none text-xs text-foreground focus:outline-none w-28 px-1 placeholder:text-muted-foreground/50"
              autoFocus
            />
            <button type="submit" className="text-emerald-500 hover:text-emerald-400 p-0.5 rounded-full">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingWord(false);
                setNewWordInput("");
              }}
              className="text-destructive hover:text-destructive/80 p-0.5 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingWord(true)}
            className="flex items-center gap-1 shrink-0 rounded-full border border-dashed border-white/20 bg-transparent px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-white/5 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>

      {!youtubeApiKey && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <p>
            YouTube API Key missing. Add <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">VITE_YOUTUBE_API_KEY</code> to <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">.env</code> for live search, or use the curated streams below.
          </p>
        </div>
      )}

      {/* ── Main Layout ── */}
      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

          {/* LEFT: Tabbed Main Stage */}
          <div className="space-y-4 min-w-0">

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
              {(["player", "search", "curated"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveMainTab(tab)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border",
                    activeMainTab === tab
                      ? "border-primary/40 bg-primary/20 text-primary shadow-soft"
                      : "border-white/5 bg-white/[0.03] text-muted-foreground hover:border-white/15 hover:text-foreground"
                  )}
                >
                  {tab === "player" && <Tv className="h-4 w-4" />}
                  {tab === "search" && <Search className="h-4 w-4" />}
                  {tab === "curated" && <Radio className="h-4 w-4" />}
                  <span>{tab === "player" ? "Active Player" : tab === "search" ? "Search Results" : "Curated Sounds"}</span>
                  {tab === "player" && currentVideo && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  )}
                  {tab === "search" && searchResults.length > 0 && (
                    <span className="rounded-full bg-primary/20 text-primary px-2 text-xs">{searchResults.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ─────────────────────────────────────────────────
                PLAYER TAB — always in DOM to keep iframe alive.
                Hidden via CSS when another tab is active.
            ───────────────────────────────────────────────── */}
            <div className={cn("space-y-4", activeMainTab !== "player" && "hidden")}>
              {/* YouTube Iframe Slot — GlobalAudioPlayer positions the persistent iframe right here */}
              <div
                id="music-player-slot"
                className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
              >
                {!currentVideo && (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-sidebar to-background p-8 text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                      <Music2 className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Select a video or playlist</h2>
                      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                        Search for tracks or pick from curated streams to start listening.
                      </p>
                    </div>
                  </div>
                )}
              </div>


              {/* Video info + actions */}
              {currentVideo && (
                <div className="glass-card space-y-4 rounded-2xl p-5">
                  <h1 className="text-xl font-bold text-foreground leading-snug" dangerouslySetInnerHTML={{ __html: currentVideo.title }} />
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent font-bold text-primary-foreground shadow-md">
                        {currentVideo.channelName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{currentVideo.channelName}</p>
                        <p className="text-xs text-muted-foreground">YouTube Creator</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setLiked(!liked)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition",
                          liked ? "border-primary/40 bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-foreground hover:bg-white/10"
                        )}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{liked ? "Liked" : "Like"}</span>
                      </button>
                      <AddToPlaylistButton video={currentVideo} playlists={playlists} onAdd={handleAddToPlaylist} variant="pill" />
                      <a
                        href={`https://youtube.com/watch?v=${currentVideo.videoId}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-foreground hover:bg-white/10 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>YouTube</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─────────────────────────────────────────────────
                Now-Playing pill on Search / Curated tabs
            ───────────────────────────────────────────────── */}
            {currentVideo && activeMainTab !== "player" && (
              <button
                onClick={() => setActiveMainTab("player")}
                className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-left hover:bg-primary/15 transition"
              >
                <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-xl">
                  <img src={currentVideo.thumbnail} alt="" className="h-full w-full object-cover" />
                  {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <span className="flex items-end gap-[2px] h-3">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-[2.5px] rounded-full bg-primary animate-bounce"
                            style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-primary">{isPlaying ? "Now Playing" : "Paused"}</p>
                  <p className="truncate text-sm font-medium text-foreground" dangerouslySetInnerHTML={{ __html: currentVideo.title }} />
                  <p className="truncate text-xs text-muted-foreground">{currentVideo.channelName}</p>
                </div>
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary shrink-0">
                  ▶ Back to Player
                </span>
              </button>
            )}

            {/* ─────────────────────────────────────────────────
                SEARCH RESULTS TAB
            ───────────────────────────────────────────────── */}
            {activeMainTab === "search" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    {searchQuery ? `Results for "${searchQuery}"` : "YouTube Search Results"}
                  </h2>
                  <span className="text-xs text-muted-foreground">{searchResults.length} videos found</span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl">
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h3 className="text-base font-bold text-foreground">No search results yet</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Type in the search bar above or pick a quick tag to find tracks.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {searchResults.map((video) => (
                      <VideoCard
                        key={video.videoId}
                        video={video}
                        isActive={currentVideo?.videoId === video.videoId}
                        isPlaying={isPlaying}
                        playlists={playlists}
                        onPlay={() => handlePlayTrack(video)}
                        onAdd={handleAddToPlaylist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────
                CURATED SOUNDS TAB
            ───────────────────────────────────────────────── */}
            {activeMainTab === "curated" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" /> Curated Soundscapes
                  </h2>
                  <span className="text-xs text-muted-foreground">Handpicked 24/7 focus streams</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {PRESETS.map((video) => (
                    <VideoCard
                      key={video.videoId}
                      video={video}
                      isActive={currentVideo?.videoId === video.videoId}
                      isPlaying={isPlaying}
                      playlists={playlists}
                      onPlay={() => handlePlayTrack(video)}
                      onAdd={handleAddToPlaylist}
                      badge="Focus Stream"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Playlist Sidebar */}
          <div className="space-y-4">
            {/* Playlist selector panel */}
            <div className="glass-card rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-bold text-foreground">Up Next & Playlists</h2>
                </div>
                {playlistItems.length > 0 && (
                  <Button size="sm" onClick={playEntirePlaylist} className="h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs px-3 font-semibold gap-1.5 shadow-sm">
                    <Play className="h-3 w-3 fill-current" /> Play All
                  </Button>
                )}
              </div>

              {playlists.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {playlists.map((p) => {
                    const isSelected = selectedPlaylist?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlaylist(p)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                          isSelected
                            ? "border-primary/40 bg-primary/20 text-primary font-semibold"
                            : "border-white/8 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary" />}
                        <span className="truncate max-w-[110px]">{p.name}</span>
                        <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-foreground">{p.itemCount ?? 0}</span>
                        <span
                          role="button"
                          title="Delete playlist"
                          onClick={(e) => handleDeletePlaylist(p.id, e)}
                          className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 border border-dashed border-white/10 rounded-xl">
                  <p className="text-xs text-muted-foreground">No playlists yet</p>
                  <Button size="sm" onClick={() => setShowCreateModal(true)} className="mt-2 text-xs bg-primary/20 text-primary hover:bg-primary/30 h-7 rounded-lg">
                    + Create First Playlist
                  </Button>
                </div>
              )}
            </div>

            {/* Playlist track queue */}
            <div className="glass-card rounded-2xl p-4 min-h-[450px] flex flex-col">
              {selectedPlaylist ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 px-1">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{selectedPlaylist.name}</h3>
                      <p className="text-xs text-muted-foreground">{playlistItems.length} songs in queue</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleShuffle}
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-lg transition",
                          isShuffle ? "text-primary bg-primary/20 border border-primary/20" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        )}
                        title="Shuffle queue"
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={toggleRepeat}
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-lg transition",
                          isRepeat ? "text-primary bg-primary/20 border border-primary/20" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        )}
                        title="Repeat current"
                      >
                        <Repeat className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {playlistItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Music2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-medium text-foreground">Playlist is empty</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                          Click <Plus className="inline h-3 w-3 text-primary" /> on any video to add it here.
                        </p>
                      </div>
                    ) : (
                      playlistItems.map((item, index) => {
                        const video: VideoInfo = {
                          videoId: item.videoId, title: item.title,
                          channelName: item.channelName, thumbnail: item.thumbnail,
                          durationSeconds: item.durationSeconds,
                        };
                        const active = currentVideo?.videoId === item.videoId;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handlePlayPlaylistItem(index)}
                            className={cn(
                              "group relative flex items-center gap-2.5 rounded-xl border p-2 transition cursor-pointer select-none",
                              active ? "border-primary/40 bg-primary/10" : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5"
                            )}
                          >

                            <span className="text-xs font-bold text-muted-foreground w-4 text-center shrink-0 pointer-events-none">{index + 1}</span>

                            <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-black pointer-events-none">
                              <img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                              {active && isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                  <span className="flex items-end gap-[2px] h-3">
                                    {[0, 1, 2].map((i) => (
                                      <span key={i} className="w-[2.5px] rounded-full bg-primary animate-bounce"
                                        style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />
                                    ))}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 pointer-events-none">
                              <p
                                className={cn("line-clamp-1 text-xs font-semibold leading-tight", active ? "text-primary" : "text-foreground")}
                                dangerouslySetInnerHTML={{ __html: item.title }}
                              />
                              <p className="truncate text-[10px] text-muted-foreground mt-0.5">{item.channelName}</p>
                            </div>

                            {/* Controls — visible on mobile/touch, hover-revealed on desktop */}
                            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveItem(index, "up", e); }}
                                disabled={index === 0}
                                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-20 transition"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMoveItem(index, "down", e); }}
                                disabled={index === playlistItems.length - 1}
                                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-20 transition"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveFromPlaylist(item.id, e); }}
                                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-red-400 transition"
                                title="Remove from playlist"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                  <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No Playlist Selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Create Playlist Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-sidebar p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" /> Create New Playlist
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Playlist Title</label>
                <input
                  type="text"
                  placeholder="e.g., Deep Focus Beats, Ethiopian Mezmur, Calm Rain..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setShowCreateModal(false)} className="bg-white/10 text-foreground hover:bg-white/15">Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/95 font-semibold">Create Playlist</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
