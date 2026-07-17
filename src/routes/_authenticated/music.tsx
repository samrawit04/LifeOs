import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMusicPlayer, type VideoInfo } from "@/lib/music-player-context";
import { apiClient, type Playlist, type PlaylistItem } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Play,
  Plus,
  Trash2,
  ListMusic,
  Search,
  ChevronUp,
  ChevronDown,
  Music2,
  FolderMusic,
  ExternalLink,
  Volume2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/music")({
  component: MusicPage,
  head: () => ({
    meta: [
      { title: "Music & Playlists · LifeOS" },
      { name: "description", content: "Create calm background playlists with YouTube music." },
    ],
  }),
});

const PRESETS: VideoInfo[] = [
  {
    videoId: "jfKfPfyJRdk",
    title: "lofi hip hop radio 📚 beats to study/relax to",
    channelName: "Lofi Girl",
    thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/0.jpg",
    durationSeconds: 0,
  },
  {
    videoId: "5qap5aO4i9A",
    title: "lofi hip hop radio 💤 beats to sleep/chill to",
    channelName: "Lofi Girl",
    thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/0.jpg",
    durationSeconds: 0,
  },
  {
    videoId: "vF5L-pMmsr0",
    title: "Coffee Shop Ambience ☕ Smooth Jazz Music & Rain Sounds",
    channelName: "Cafe Music BGM channel",
    thumbnail: "https://img.youtube.com/vi/vF5L-pMmsr0/0.jpg",
    durationSeconds: 10800,
  },
  {
    videoId: "4xDzrJKXOOY",
    title: "synthwave radio 🌌 beats to chill/game to",
    channelName: "Lofi Girl",
    thumbnail: "https://img.youtube.com/vi/4xDzrJKXOOY/0.jpg",
    durationSeconds: 0,
  },
  {
    videoId: "mPZkdNFkNps",
    title: "Cozy Rain & Thunderstorm ⛈️ Sleep, Study, Relaxing Ambience",
    channelName: "Rainstorm Ambience",
    thumbnail: "https://img.youtube.com/vi/mPZkdNFkNps/0.jpg",
    durationSeconds: 28800,
  }
];

function MusicPage() {
  const { currentVideo, isPlaying, play, playPlaylist } = useMusicPlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Check if API key is present
  const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY || "";

  // Load playlists on mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  // Load items when selected playlist changes
  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistItems(selectedPlaylist.id);
    } else {
      setPlaylistItems([]);
    }
  }, [selectedPlaylist]);

  const loadPlaylists = async () => {
    try {
      const data = await apiClient.playlists.getAll();
      setPlaylists(data);
      if (data.length > 0 && !selectedPlaylist) {
        setSelectedPlaylist(data[0]);
      }
    } catch (err) {
      toast.error("Failed to load playlists");
    }
  };

  const loadPlaylistItems = async (id: string) => {
    try {
      const data = await apiClient.playlists.getItems(id);
      setPlaylistItems(data);
    } catch (err) {
      toast.error("Failed to load playlist items");
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const created = await apiClient.playlists.create(newPlaylistName.trim());
      setPlaylists((prev) => [created, ...prev]);
      setSelectedPlaylist(created);
      setNewPlaylistName("");
      toast.success("Playlist created!");
    } catch (err) {
      toast.error("Failed to create playlist");
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    try {
      await apiClient.playlists.delete(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null);
      }
      toast.success("Playlist deleted");
    } catch (err) {
      toast.error("Failed to delete playlist");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!youtubeApiKey) {
      toast.error("To search, please configure VITE_YOUTUBE_API_KEY in your .env file.");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery.trim()
        )}&type=video&key=${youtubeApiKey}&maxResults=10`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      const videos: VideoInfo[] = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${item.id.videoId}/0.jpg`,
        durationSeconds: 0, // YouTube search doesn't give duration without sub-query
      }));

      setSearchResults(videos);
    } catch (err) {
      toast.error("Failed to perform YouTube search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToPlaylist = async (video: VideoInfo, playlistId: string) => {
    try {
      await apiClient.playlists.addItem(playlistId, {
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        channelName: video.channelName,
        durationSeconds: video.durationSeconds,
      });
      // Refresh playlist if currently selected
      if (selectedPlaylist?.id === playlistId) {
        loadPlaylistItems(playlistId);
      }
      // Update playlist list count
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId ? { ...p, itemCount: p.itemCount + 1 } : p
        )
      );
      toast.success("Added to playlist!");
    } catch (err) {
      toast.error("Failed to add video to playlist");
    }
  };

  const handleRemoveFromPlaylist = async (itemId: string) => {
    if (!selectedPlaylist) return;
    try {
      await apiClient.playlists.removeItem(selectedPlaylist.id, itemId);
      setPlaylistItems((prev) => prev.filter((item) => item.id !== itemId));
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === selectedPlaylist.id ? { ...p, itemCount: p.itemCount - 1 } : p
        )
      );
      toast.success("Removed from playlist");
    } catch (err) {
      toast.error("Failed to remove item");
    }
  };

  const handleMoveItem = async (index: number, direction: "up" | "down") => {
    if (!selectedPlaylist) return;
    const newItems = [...playlistItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap elements locally
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update state instantly for fluid visual response
    setPlaylistItems(newItems);

    try {
      // Re-map index positions
      const reorderList = newItems.map((item, idx) => ({
        id: item.id,
        position: idx,
      }));
      await apiClient.playlists.reorderItems(selectedPlaylist.id, reorderList);
    } catch (err) {
      toast.error("Failed to update track order");
      // Revert if API failed
      loadPlaylistItems(selectedPlaylist.id);
    }
  };

  const playEntirePlaylist = () => {
    if (playlistItems.length === 0) return;
    const videos: VideoInfo[] = playlistItems.map((item) => ({
      videoId: item.videoId,
      title: item.title,
      channelName: item.channelName,
      thumbnail: item.thumbnail,
      durationSeconds: item.durationSeconds,
    }));
    playPlaylist(videos, 0);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10">
        <h1 className="font-display text-5xl font-semibold leading-tight text-gradient-primary">
          Music & Focus
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Create calm background soundtracks, listen to ambient streams, and build focus playlists.
        </p>
      </header>

      {/* Grid Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Panel: Search & Presets (5 cols) */}
        <div className="space-y-8 lg:col-span-5">
          {/* Search Card */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-medium text-foreground">
              <Search className="h-5 w-5 text-primary" /> Search YouTube
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search songs, lofi, relaxing rain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Button type="submit" disabled={isSearching} className="bg-primary text-primary-foreground hover:bg-primary/95">
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </form>

            {!youtubeApiKey && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <p>
                  Search is currently disabled because the YouTube API key is missing. Add{" "}
                  <code className="bg-black/20 px-1 py-0.5 rounded">VITE_YOUTUBE_API_KEY</code> to your frontend environment or enjoy the handpicked presets below!
                </p>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {searchResults.map((video) => (
                  <div key={video.videoId} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2 hover:bg-white/[0.04]">
                    <img src={video.thumbnail} alt={video.title} className="h-12 w-16 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" dangerouslySetInnerHTML={{ __html: video.title }} />
                      <p className="truncate text-xs text-muted-foreground">{video.channelName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => play(video)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary transition hover:bg-primary/30"
                        title="Play now"
                      >
                        <Play className="h-4 w-4 fill-current" />
                      </button>
                      {playlists.length > 0 && (
                        <div className="relative group">
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-white/20 hover:text-foreground"
                            title="Add to playlist"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <div className="absolute right-0 bottom-full z-10 mb-2 hidden w-48 rounded-xl border border-white/10 bg-sidebar/95 p-1 shadow-lg group-hover:block">
                            <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Add to:</p>
                            {playlists.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => handleAddToPlaylist(video, p.id)}
                                className="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/5"
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Presets Card */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-medium text-foreground">
              <Volume2 className="h-5 w-5 text-primary" /> Curated Sounds
            </h2>
            <div className="grid gap-3">
              {PRESETS.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] cursor-pointer"
                  onClick={() => play(video)}
                >
                  <img src={video.thumbnail} alt={video.title} className="h-12 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{video.channelName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        play(video);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary transition hover:bg-primary/30"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                    {playlists.length > 0 && (
                      <div className="relative group" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-white/20 hover:text-foreground"
                          title="Add to playlist"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 bottom-full z-10 mb-2 hidden w-48 rounded-xl border border-white/10 bg-sidebar/95 p-1 shadow-lg group-hover:block">
                          <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Add to:</p>
                          {playlists.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleAddToPlaylist(video, p.id)}
                              className="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/5"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel: Active Player (3 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center h-full justify-between min-h-[400px]">
            <h2 className="flex items-center gap-2 font-display text-xl font-medium text-foreground self-start">
              <Music2 className="h-5 w-5 text-primary" /> Focus Player
            </h2>

            {currentVideo ? (
              <div className="w-full space-y-6 flex-1 flex flex-col justify-center">
                {/* Visual player disc / frame */}
                <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="line-clamp-2 text-base font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: currentVideo.title }} />
                  <p className="text-sm text-muted-foreground">{currentVideo.channelName}</p>
                </div>

                <div className="flex justify-center gap-3">
                  <a
                    href={`https://youtube.com/watch?v=${currentVideo.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 my-auto">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Music2 className="h-10 w-10 animate-bounce" />
                  <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Silence is golden</h3>
                  <p className="mt-1 text-sm text-muted-foreground px-4">
                    Choose a preset or playlist item on either side to start your focus session.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Playlists (3 cols) */}
        <div className="space-y-6 lg:col-span-3">
          <div className="glass-card rounded-2xl p-6 h-full flex flex-col min-h-[400px]">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-medium text-foreground">
              <FolderMusic className="h-5 w-5 text-primary" /> My Playlists
            </h2>

            {/* Create Playlist Form */}
            <form onSubmit={handleCreatePlaylist} className="mb-6 flex gap-2">
              <Input
                placeholder="New playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="bg-white/5 border-white/10 h-9"
              />
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/95">
                Create
              </Button>
            </form>

            {/* Playlist list */}
            {playlists.length > 0 ? (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex gap-2 pb-2 overflow-x-auto border-b border-white/5 scrollbar-thin">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => setSelectedPlaylist(playlist)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
                        selectedPlaylist?.id === playlist.id
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "border border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      <ListMusic className="h-3.5 w-3.5" />
                      {playlist.name}
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-foreground">
                        {playlist.itemCount}
                      </span>
                      <Trash2
                        className="h-3 w-3 hover:text-red-400"
                        onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                      />
                    </button>
                  ))}
                </div>

                {/* Selected Playlist tracks */}
                {selectedPlaylist && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-foreground truncate max-w-[150px]">
                        {selectedPlaylist.name}
                      </h3>
                      {playlistItems.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={playEntirePlaylist}
                          className="h-7 text-xs text-primary hover:text-primary/90"
                        >
                          <Play className="mr-1 h-3 w-3 fill-current" /> Play All
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
                      {playlistItems.length > 0 ? (
                        playlistItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="group flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.01] p-1.5 hover:bg-white/[0.03] transition cursor-pointer"
                            onClick={() => play({
                              videoId: item.videoId,
                              title: item.title,
                              channelName: item.channelName,
                              thumbnail: item.thumbnail,
                              durationSeconds: item.durationSeconds,
                            })}
                          >
                            <img src={item.thumbnail} alt={item.title} className="h-10 w-14 rounded object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground" dangerouslySetInnerHTML={{ __html: item.title }} />
                              <p className="truncate text-[10px] text-muted-foreground">{item.channelName}</p>
                            </div>
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleMoveItem(index, "up")}
                                disabled={index === 0}
                                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-30"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleMoveItem(index, "down")}
                                disabled={index === playlistItems.length - 1}
                                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-30"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleRemoveFromPlaylist(item.id)}
                                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/5 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                          <Plus className="mb-2 h-6 w-6 opacity-40" />
                          <p>Add some tracks to get started!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-8 text-sm text-muted-foreground">
                <ListMusic className="mb-2 h-8 w-8 opacity-40" />
                <p>No playlists found.</p>
                <p className="text-xs mt-1">Create one above to begin storing tracks.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
