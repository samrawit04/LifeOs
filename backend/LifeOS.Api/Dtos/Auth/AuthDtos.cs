namespace LifeOS.Api.Dtos.Auth;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record GoogleCallbackRequest(string Code, string? RedirectUri);

public record AuthResponse(string Token, UserDto User);
public record UserDto(Guid Id, string Email);
