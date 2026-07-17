using LifeOS.Api.Data;
using LifeOS.Api.Dtos.Playlists;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/playlists")]
public class PlaylistsController(AppDbContext db) : ControllerBase
{
    // ── GET /api/playlists ────────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<PlaylistDto>>> GetAll()
    {
        var userId = TokenService.GetUserId(User);
        var playlists = await db.Playlists
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => new PlaylistDto(
                p.Id, p.UserId, p.Name,
                p.Items.Count,
                p.CreatedAt, p.UpdatedAt))
            .ToListAsync();
        return Ok(playlists);
    }

    // ── POST /api/playlists ───────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<PlaylistDto>> Create([FromBody] CreatePlaylistRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var playlist = new Playlist { UserId = userId, Name = req.Name.Trim() };
        db.Playlists.Add(playlist);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll),
            new PlaylistDto(playlist.Id, playlist.UserId, playlist.Name, 0,
                playlist.CreatedAt, playlist.UpdatedAt));
    }

    // ── PATCH /api/playlists/{id} ─────────────────────────────────────────────
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<PlaylistDto>> Rename(Guid id, [FromBody] CreatePlaylistRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var playlist = await db.Playlists
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (playlist is null) return NotFound();

        playlist.Name = req.Name.Trim();
        await db.SaveChangesAsync();
        return Ok(new PlaylistDto(playlist.Id, playlist.UserId, playlist.Name,
            playlist.Items.Count, playlist.CreatedAt, playlist.UpdatedAt));
    }

    // ── DELETE /api/playlists/{id} ────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var playlist = await db.Playlists
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (playlist is null) return NotFound();

        db.Playlists.Remove(playlist);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── GET /api/playlists/{id}/items ─────────────────────────────────────────
    [HttpGet("{id:guid}/items")]
    public async Task<ActionResult<List<PlaylistItemDto>>> GetItems(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var owns = await db.Playlists.AnyAsync(p => p.Id == id && p.UserId == userId);
        if (!owns) return NotFound();

        var items = await db.PlaylistItems
            .Where(pi => pi.PlaylistId == id)
            .OrderBy(pi => pi.Position)
            .Select(pi => ToItemDto(pi))
            .ToListAsync();
        return Ok(items);
    }

    // ── POST /api/playlists/{id}/items ────────────────────────────────────────
    [HttpPost("{id:guid}/items")]
    public async Task<ActionResult<PlaylistItemDto>> AddItem(Guid id, [FromBody] AddPlaylistItemRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var playlist = await db.Playlists
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (playlist is null) return NotFound();

        var maxPos = await db.PlaylistItems
            .Where(pi => pi.PlaylistId == id)
            .Select(pi => (int?)pi.Position)
            .MaxAsync() ?? -1;

        var item = new PlaylistItem
        {
            PlaylistId = id,
            VideoId = req.VideoId,
            Title = req.Title,
            Thumbnail = req.Thumbnail,
            ChannelName = req.ChannelName,
            DurationSeconds = req.DurationSeconds,
            Position = maxPos + 1,
        };
        db.PlaylistItems.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetItems), new { id }, ToItemDto(item));
    }

    // ── DELETE /api/playlists/{id}/items/{itemId} ─────────────────────────────
    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid id, Guid itemId)
    {
        var userId = TokenService.GetUserId(User);
        var owns = await db.Playlists.AnyAsync(p => p.Id == id && p.UserId == userId);
        if (!owns) return NotFound();

        var item = await db.PlaylistItems
            .FirstOrDefaultAsync(pi => pi.Id == itemId && pi.PlaylistId == id);
        if (item is null) return NotFound();

        db.PlaylistItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── PATCH /api/playlists/{id}/items/reorder ───────────────────────────────
    [HttpPatch("{id:guid}/items/reorder")]
    public async Task<IActionResult> Reorder(Guid id, [FromBody] ReorderItemsRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var owns = await db.Playlists.AnyAsync(p => p.Id == id && p.UserId == userId);
        if (!owns) return NotFound();

        var itemIds = req.Items.Select(r => r.Id).ToList();
        var items = await db.PlaylistItems
            .Where(pi => pi.PlaylistId == id && itemIds.Contains(pi.Id))
            .ToListAsync();

        foreach (var entry in req.Items)
        {
            var item = items.FirstOrDefault(i => i.Id == entry.Id);
            if (item is not null) item.Position = entry.Position;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static PlaylistItemDto ToItemDto(PlaylistItem pi) => new(
        pi.Id, pi.PlaylistId, pi.Position,
        pi.VideoId, pi.Title, pi.Thumbnail, pi.ChannelName,
        pi.DurationSeconds, pi.AddedAt);
}
