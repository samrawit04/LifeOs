using LifeOS.Api.Data;
using LifeOS.Api.Dtos.Notifications;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    // ── GET /api/notifications ────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetAll()
    {
        var userId = TokenService.GetUserId(User);
        var notifications = await db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => ToDto(n))
            .ToListAsync();
        return Ok(notifications);
    }

    // ── POST /api/notifications ───────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<NotificationDto>> Create([FromBody] CreateNotificationRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var notification = new Notification
        {
            UserId = userId,
            Category = req.Category,
            Title = req.Title,
            Body = req.Body,
            Icon = req.Icon,
            Link = req.Link,
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), ToDto(notification));
    }

    // ── PATCH /api/notifications/{id}/read ────────────────────────────────────
    [HttpPatch("{id:guid}/read")]
    public async Task<ActionResult<NotificationDto>> MarkRead(Guid id, [FromBody] MarkReadRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notification is null) return NotFound();

        notification.IsRead = req.IsRead;
        await db.SaveChangesAsync();
        return Ok(ToDto(notification));
    }

    // ── PATCH /api/notifications/read-all ────────────────────────────────────
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = TokenService.GetUserId(User);
        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }

    // ── DELETE /api/notifications/{id} ───────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notification is null) return NotFound();

        db.Notifications.Remove(notification);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── DELETE /api/notifications ─────────────────────────────────────────────
    [HttpDelete]
    public async Task<IActionResult> DeleteAll()
    {
        var userId = TokenService.GetUserId(User);
        await db.Notifications
            .Where(n => n.UserId == userId)
            .ExecuteDeleteAsync();
        return NoContent();
    }

    private static NotificationDto ToDto(Notification n) => new(
        n.Id, n.UserId, n.Category, n.Title, n.Body, n.Icon, n.Link, n.IsRead, n.CreatedAt
    );
}
