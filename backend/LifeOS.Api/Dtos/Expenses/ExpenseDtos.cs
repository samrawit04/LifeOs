namespace LifeOS.Api.Dtos.Expenses;

public record ExpenseDto(
    Guid Id,
    Guid UserId,
    decimal Amount,
    string Currency,
    string Category,
    string? Note,
    DateTime OccurredAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateExpenseRequest(
    decimal Amount,
    string Category = "Other",
    string? Note = null,
    string Currency = "USD",
    DateTime? OccurredAt = null
);

public record UpdateExpenseRequest(
    decimal? Amount,
    string? Category,
    string? Note,
    DateTime? OccurredAt
);
