namespace LifeOS.Api.Models;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Calendar, Task, Expense, General</summary>
    public string Category { get; set; } = "general";

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Emoji icon, e.g. "📅"</summary>
    public string? Icon { get; set; }

    /// <summary>Frontend route to navigate to on click, e.g. "/calendar"</summary>
    public string? Link { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
