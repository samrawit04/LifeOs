namespace LifeOS.Api.Dtos.Notifications;

public record NotificationDto(
    Guid Id,
    Guid UserId,
    string Category,
    string Title,
    string Body,
    string? Icon,
    string? Link,
    bool IsRead,
    DateTime CreatedAt
);

public record CreateNotificationRequest(
    string Category,
    string Title,
    string Body,
    string? Icon = null,
    string? Link = null
);

public record MarkReadRequest(
    bool IsRead = true
);
