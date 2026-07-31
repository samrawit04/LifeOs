namespace LifeOS.Api.Dtos.PlannedPurchases;

public record PlannedPurchaseDto(
    Guid Id,
    Guid UserId,
    string Name,
    decimal Amount,
    string Category,
    bool Purchased,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePlannedPurchaseRequest(
    string Name,
    decimal Amount,
    string Category = "Shopping"
);

public record UpdatePlannedPurchaseRequest(
    string? Name,
    decimal? Amount,
    string? Category,
    bool? Purchased
);
