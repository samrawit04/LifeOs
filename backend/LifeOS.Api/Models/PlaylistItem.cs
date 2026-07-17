namespace LifeOS.Api.Models;

public class PlaylistItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PlaylistId { get; set; }
    public Playlist Playlist { get; set; } = null!;

    /// <summary>Order within the playlist (0-based).</summary>
    public int Position { get; set; } = 0;

    // YouTube video metadata (cached so we don't need an API call on every load)
    public string VideoId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Thumbnail { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
    public int DurationSeconds { get; set; } = 0;

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
