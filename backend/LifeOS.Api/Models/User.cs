namespace LifeOS.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }   // null for Google OAuth-only users
    public string? GoogleId { get; set; }        // set for Google OAuth users
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Folder> Folders { get; set; } = [];
    public ICollection<Item> Items { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
}
