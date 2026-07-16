using LifeOS.Api.Models;

namespace LifeOS.Api.Dtos.Items;

public record ItemDto(
    Guid Id,
    Guid UserId,
    string Type,          // lowercase string to match frontend: "sticky", "notebook_page", "task", "event"
    string? Title,
    string? Content,
    Guid? FolderId,
    string? Color,
    string[] Tags,
    DateTime? DueDate,
    DateTime? EventDate,
    double? PosX,
    double? PosY,
    double? Width,
    double? Height,
    string? Priority,
    bool Completed,
    bool Pinned,
    bool Archived,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateItemRequest(
    string Type,          // "sticky" | "notebook_page" | "task" | "event"
    string? Title,
    string? Content,
    Guid? FolderId,
    string? Color,
    string[]? Tags,
    DateTime? DueDate,
    DateTime? EventDate,
    double? PosX,
    double? PosY,
    double? Width,
    double? Height,
    string? Priority
);

// All fields nullable — only non-null fields are patched (partial update)
public record UpdateItemRequest(
    string? Title,
    string? Content,
    Guid? FolderId,
    bool? ClearFolderId,   // set to true to explicitly set FolderId = null
    string? Color,
    string[]? Tags,
    DateTime? DueDate,
    bool? ClearDueDate,
    DateTime? EventDate,
    bool? ClearEventDate,
    double? PosX,
    double? PosY,
    double? Width,
    double? Height,
    string? Priority,
    bool? Completed,
    bool? Pinned,
    bool? Archived
);
