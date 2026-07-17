using LifeOS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistItem> PlaylistItems => Set<PlaylistItem>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        // ── User ──────────────────────────────────────────────
        model.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).IsRequired();
        });

        // ── Folder ────────────────────────────────────────────
        model.Entity<Folder>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasOne(f => f.User)
             .WithMany(u => u.Folders)
             .HasForeignKey(f => f.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            // Self-referential: parent → children
            e.HasOne(f => f.ParentFolder)
             .WithMany(f => f.Children)
             .HasForeignKey(f => f.ParentFolderId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(f => f.UserId);
            e.Property(f => f.Color).HasDefaultValue("#F5C86A");
        });

        // ── Item ──────────────────────────────────────────────
        model.Entity<Item>(e =>
        {
            e.HasKey(i => i.Id);
            e.HasOne(i => i.User)
             .WithMany(u => u.Items)
             .HasForeignKey(i => i.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.Folder)
             .WithMany()
             .HasForeignKey(i => i.FolderId)
             .OnDelete(DeleteBehavior.SetNull);

            // Store ItemType enum as string in DB
            e.Property(i => i.Type)
             .HasConversion<string>();

            // Store Tags as PostgreSQL native text[] array
            e.Property(i => i.Tags)
             .HasColumnType("text[]");

            e.HasIndex(i => i.UserId);
            e.HasIndex(i => i.Type);
            e.HasIndex(i => i.FolderId);
            e.HasIndex(i => i.Archived);
        });

        // ── Expense ───────────────────────────────────────────
        model.Entity<Expense>(e =>
        {
            e.HasKey(ex => ex.Id);
            e.HasOne(ex => ex.User)
             .WithMany(u => u.Expenses)
             .HasForeignKey(ex => ex.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.Property(ex => ex.Amount).HasColumnType("numeric(12,2)");
            e.Property(ex => ex.Currency).HasDefaultValue("USD");
            e.Property(ex => ex.Category).HasDefaultValue("Other");

            e.HasIndex(ex => new { ex.UserId, ex.OccurredAt });
        });

        // ── Playlist ──────────────────────────────────────────
        model.Entity<Playlist>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.User)
             .WithMany(u => u.Playlists)
             .HasForeignKey(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(p => p.Items)
             .WithOne(pi => pi.Playlist)
             .HasForeignKey(pi => pi.PlaylistId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(p => p.UserId);
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
        });

        // ── PlaylistItem ───────────────────────────────────────
        model.Entity<PlaylistItem>(e =>
        {
            e.HasKey(pi => pi.Id);
            e.HasIndex(pi => pi.PlaylistId);
            e.Property(pi => pi.VideoId).HasMaxLength(20).IsRequired();
            e.Property(pi => pi.Title).HasMaxLength(500);
            e.Property(pi => pi.Thumbnail).HasMaxLength(500);
            e.Property(pi => pi.ChannelName).HasMaxLength(200);
        });
    }

    // Auto-update UpdatedAt on every SaveChanges
    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Modified)
            {
                if (entry.Entity is Folder f) f.UpdatedAt = now;
                if (entry.Entity is Item i) i.UpdatedAt = now;
                if (entry.Entity is Expense ex) ex.UpdatedAt = now;
                if (entry.Entity is Playlist p) p.UpdatedAt = now;
            }
        }
        return base.SaveChangesAsync(ct);
    }
}
