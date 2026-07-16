using LifeOS.Api.Data;
using LifeOS.Api.Dtos.Folders;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/folders")]
public class FoldersController(AppDbContext db) : ControllerBase
{
    // ── GET /api/folders ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<FolderDto>>> GetAll()
    {
        var userId = TokenService.GetUserId(User);
        var folders = await db.Folders
            .Where(f => f.UserId == userId)
            .OrderBy(f => f.Name)
            .Select(f => ToDto(f))
            .ToListAsync();
        return Ok(folders);
    }

    // ── POST /api/folders ────────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create([FromBody] CreateFolderRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var folder = new Folder
        {
            UserId = userId,
            Name = req.Name,
            ParentFolderId = req.ParentFolderId,
            Color = req.Color,
        };
        db.Folders.Add(folder);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), ToDto(folder));
    }

    // ── PATCH /api/folders/{id} ───────────────────────────────────────────────
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<FolderDto>> Update(Guid id, [FromBody] UpdateFolderRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder is null) return NotFound();

        if (req.Name is not null) folder.Name = req.Name;
        if (req.Color is not null) folder.Color = req.Color;
        if (req.ParentFolderId.HasValue) folder.ParentFolderId = req.ParentFolderId;

        await db.SaveChangesAsync();
        return Ok(ToDto(folder));
    }

    // ── DELETE /api/folders/{id} ─────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder is null) return NotFound();

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static FolderDto ToDto(Folder f) => new(
        f.Id, f.UserId, f.Name, f.ParentFolderId, f.Color, f.CreatedAt, f.UpdatedAt
    );
}
