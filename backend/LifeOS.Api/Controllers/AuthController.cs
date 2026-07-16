using LifeOS.Api.Data;
using LifeOS.Api.Dtos.Auth;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeOS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokenService, GoogleAuthService googleAuth, IConfiguration config) : ControllerBase
{
    // ── POST /api/auth/register ─────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(new { message = "Email already registered." });

        var user = new User
        {
            Email = req.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(new AuthResponse(
            tokenService.GenerateToken(user),
            new UserDto(user.Id, user.Email)
        ));
    }

    // ── POST /api/auth/login ────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
        if (user is null || user.PasswordHash is null)
            return Unauthorized(new { message = "Invalid email or password." });

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(new AuthResponse(
            tokenService.GenerateToken(user),
            new UserDto(user.Id, user.Email)
        ));
    }

    // ── GET /api/auth/me ────────────────────────────────────────────────────
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = TokenService.GetUserId(User);
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();
        return Ok(new UserDto(user.Id, user.Email));
    }

    // ── GET /api/auth/google ─────────────────────────────────────────────────
    [HttpGet("google")]
    public IActionResult GoogleLogin()
    {
        var callbackUrl = config["Google:CallbackUrl"]
            ?? $"{Request.Scheme}://{Request.Host}/api/auth/google/callback";
        var url = googleAuth.BuildAuthorizationUrl(callbackUrl);
        return Redirect(url);
    }

    // ── GET /api/auth/google/callback ────────────────────────────────────────
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code, [FromQuery] string? state)
    {
        try
        {
            var callbackUrl = config["Google:CallbackUrl"]
                ?? $"{Request.Scheme}://{Request.Host}/api/auth/google/callback";

            var (googleId, email) = await googleAuth.ExchangeCodeAsync(code, callbackUrl);

            // Find existing user by GoogleId or Email
            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId)
                    ?? await db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower());

            if (user is null)
            {
                // New user via Google OAuth
                user = new User { Email = email.ToLower(), GoogleId = googleId };
                db.Users.Add(user);
            }
            else if (user.GoogleId is null)
            {
                // Existing email user — link Google account
                user.GoogleId = googleId;
            }

            await db.SaveChangesAsync();

            var token = tokenService.GenerateToken(user);
            var frontendUrl = config["Frontend:BaseUrl"] ?? "http://localhost:5173";

            // Redirect back to frontend with token in URL param
            return Redirect($"{frontendUrl}/auth/callback?token={token}");
        }
        catch (Exception ex)
        {
            var frontendUrl = config["Frontend:BaseUrl"] ?? "http://localhost:5173";
            return Redirect($"{frontendUrl}/auth?error={Uri.EscapeDataString(ex.Message)}");
        }
    }
}
