using LifeOS.Api.Data;
using LifeOS.Api.Dtos.Items;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/items")]
public class ItemsController(AppDbContext db) : ControllerBase
{
    // ── GET /api/items ────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<ItemDto>>> GetAll()
    {
        var userId = TokenService.GetUserId(User);
        var items = await db.Items
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.UpdatedAt)
            .Select(i => ToDto(i))
            .ToListAsync();
        return Ok(items);
    }

    // ── POST /api/items ───────────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<ItemDto>> Create([FromBody] CreateItemRequest req)
    {
        var userId = TokenService.GetUserId(User);

        if (!Enum.TryParse<ItemType>(ToPascalCase(req.Type), out var itemType))
            return BadRequest(new { message = $"Invalid item type: {req.Type}" });

        var item = new Item
        {
            UserId = userId,
            Type = itemType,
            Title = req.Title,
            Content = req.Content,
            FolderId = req.FolderId,
            Color = req.Color,
            Tags = req.Tags ?? [],
            DueDate = req.DueDate,
            EventDate = req.EventDate,
            PosX = req.PosX,
            PosY = req.PosY,
            Width = req.Width,
            Height = req.Height,
            Priority = req.Priority,
        };

        db.Items.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), ToDto(item));
    }

    // ── PATCH /api/items/{id} ─────────────────────────────────────────────────
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<ItemDto>> Update(Guid id, [FromBody] UpdateItemRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        if (item is null) return NotFound();

        if (req.Title is not null) item.Title = req.Title;
        if (req.Content is not null) item.Content = req.Content;
        if (req.Color is not null) item.Color = req.Color;
        if (req.Tags is not null) item.Tags = req.Tags;
        if (req.Priority is not null) item.Priority = req.Priority;
        if (req.Completed.HasValue) item.Completed = req.Completed.Value;
        if (req.Pinned.HasValue) item.Pinned = req.Pinned.Value;
        if (req.Archived.HasValue) item.Archived = req.Archived.Value;
        if (req.PosX.HasValue) item.PosX = req.PosX;
        if (req.PosY.HasValue) item.PosY = req.PosY;
        if (req.Width.HasValue) item.Width = req.Width;
        if (req.Height.HasValue) item.Height = req.Height;

        // Explicit null-clearing
        if (req.ClearFolderId == true) item.FolderId = null;
        else if (req.FolderId.HasValue) item.FolderId = req.FolderId;

        if (req.ClearDueDate == true) item.DueDate = null;
        else if (req.DueDate.HasValue) item.DueDate = req.DueDate;

        if (req.ClearEventDate == true) item.EventDate = null;
        else if (req.EventDate.HasValue) item.EventDate = req.EventDate;

        await db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    // ── DELETE /api/items/{id} ────────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var item = await db.Items.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        if (item is null) return NotFound();

        db.Items.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ItemDto ToDto(Item i) => new(
        i.Id, i.UserId,
        ToSnakeCase(i.Type.ToString()),
        i.Title, i.Content, i.FolderId, i.Color, i.Tags,
        i.DueDate, i.EventDate,
        i.PosX, i.PosY, i.Width, i.Height,
        i.Priority, i.Completed, i.Pinned, i.Archived,
        i.CreatedAt, i.UpdatedAt
    );

    // "notebook_page" → "NotebookPage"
    private static string ToPascalCase(string s) =>
        string.Join("", s.Split('_').Select(w => char.ToUpper(w[0]) + w[1..]));

    // "NotebookPage" → "notebook_page"  |  "Sticky" → "sticky"
    private static string ToSnakeCase(string s) =>
        string.Concat(s.Select((c, i) =>
            i > 0 && char.IsUpper(c) ? "_" + char.ToLower(c) : char.ToLower(c).ToString()));
}
