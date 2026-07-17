namespace LifeOS.Api.Dtos.Playlists;

public record PlaylistItemDto(
    Guid Id,
    Guid PlaylistId,
    int Position,
    string VideoId,
    string Title,
    string Thumbnail,
    string ChannelName,
    int DurationSeconds,
    DateTime AddedAt
);

public record PlaylistDto(
    Guid Id,
    Guid UserId,
    string Name,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePlaylistRequest(string Name);

public record AddPlaylistItemRequest(
    string VideoId,
    string Title,
    string Thumbnail,
    string ChannelName,
    int DurationSeconds
);

public record ReorderItemsRequest(List<ReorderEntry> Items);
public record ReorderEntry(Guid Id, int Position);
