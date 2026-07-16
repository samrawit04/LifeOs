namespace LifeOS.Api.Dtos.Folders;

public record FolderDto(
    Guid Id,
    Guid UserId,
    string Name,
    Guid? ParentFolderId,
    string Color,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateFolderRequest(
    string Name,
    Guid? ParentFolderId,
    string Color = "#F5C86A"
);

public record UpdateFolderRequest(
    string? Name,
    Guid? ParentFolderId,
    string? Color
);
