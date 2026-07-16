using LifeOS.Api.Data;
using LifeOS.Api.Dtos.Expenses;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/expenses")]
public class ExpensesController(AppDbContext db) : ControllerBase
{
    // ── GET /api/expenses ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<ExpenseDto>>> GetAll()
    {
        var userId = TokenService.GetUserId(User);
        var expenses = await db.Expenses
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.OccurredAt)
            .Select(e => ToDto(e))
            .ToListAsync();
        return Ok(expenses);
    }

    // ── POST /api/expenses ────────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> Create([FromBody] CreateExpenseRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var expense = new Expense
        {
            UserId = userId,
            Amount = req.Amount,
            Currency = req.Currency,
            Category = req.Category,
            Note = req.Note,
            OccurredAt = req.OccurredAt ?? DateTime.UtcNow,
        };
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), ToDto(expense));
    }

    // ── PATCH /api/expenses/{id} ───────────────────────────────────────────────
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<ExpenseDto>> Update(Guid id, [FromBody] UpdateExpenseRequest req)
    {
        var userId = TokenService.GetUserId(User);
        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (expense is null) return NotFound();

        if (req.Amount.HasValue) expense.Amount = req.Amount.Value;
        if (req.Category is not null) expense.Category = req.Category;
        if (req.Note is not null) expense.Note = req.Note;
        if (req.OccurredAt.HasValue) expense.OccurredAt = req.OccurredAt.Value;

        await db.SaveChangesAsync();
        return Ok(ToDto(expense));
    }

    // ── DELETE /api/expenses/{id} ─────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = TokenService.GetUserId(User);
        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (expense is null) return NotFound();

        db.Expenses.Remove(expense);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ExpenseDto ToDto(Expense e) => new(
        e.Id, e.UserId, e.Amount, e.Currency, e.Category, e.Note,
        e.OccurredAt, e.CreatedAt, e.UpdatedAt
    );
}
