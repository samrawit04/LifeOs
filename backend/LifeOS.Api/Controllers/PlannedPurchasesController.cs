using LifeOS.Api.Data;
using LifeOS.Api.Dtos.PlannedPurchases;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/planned-purchases")]
public class PlannedPurchasesController(AppDbContext db) : ControllerBase
{
    // ── GET /api/planned-purchases ────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<PlannedPurchaseDto>>> GetAll()
    {
        var userId = TokenService.GetUserId(User);
        var items = await db.PlannedPurchases
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.CreatedAt)
            .Select(p => ToDto(p))
            .ToListAsync();
        return Ok(items);
    }

    // ── POST /api/planned-purchases ───────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<PlannedPurchaseDto>> Create([FromBody] CreatePlannedPurchaseRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var item = new PlannedPurchase
        {
            UserId = userId,
            Name = req.Name,
            Amount = req.Amount,
            Category = req.Category,
        };
        db.PlannedPurchases.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), ToDto(item));
    }

    // ── PATCH /api/planned-purchases/{id} ─────────────────────────────────────
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<PlannedPurchaseDto>> Update(Guid id, [FromBody] UpdatePlannedPurchaseRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var item = await db.PlannedPurchases.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name;
        if (req.Amount.HasValue) item.Amount = req.Amount.Value;
        if (req.Category is not null) item.Category = req.Category;
        if (req.Purchased.HasValue) item.Purchased = req.Purchased.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    // ── DELETE /api/planned-purchases/{id} ────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var item = await db.PlannedPurchases.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (item is null) return NotFound();

        db.PlannedPurchases.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static PlannedPurchaseDto ToDto(PlannedPurchase p) => new(
        p.Id, p.UserId, p.Name, p.Amount, p.Category, p.Purchased,
        p.CreatedAt, p.UpdatedAt
    );
}
