using Google.Apis.Auth;

namespace LifeOS.Api.Services;

public class GoogleAuthService(IConfiguration config)
{
    private readonly string _clientId = config["Google:ClientId"]
        ?? throw new InvalidOperationException("Google:ClientId is not configured.");

    private readonly string _clientSecret = config["Google:ClientSecret"]
        ?? throw new InvalidOperationException("Google:ClientSecret is not configured.");

    /// <summary>
    /// Builds the Google OAuth2 authorization URL to redirect the user to.
    /// </summary>
    public string BuildAuthorizationUrl(string callbackUrl)
    {
        var scope = Uri.EscapeDataString("openid email profile");
        return $"https://accounts.google.com/o/oauth2/v2/auth" +
               $"?client_id={Uri.EscapeDataString(_clientId)}" +
               $"&redirect_uri={Uri.EscapeDataString(callbackUrl)}" +
               $"&response_type=code" +
               $"&scope={scope}" +
               $"&access_type=offline";
    }

    /// <summary>
    /// Exchanges the OAuth authorization code for Google user profile info.
    /// Returns (GoogleId, Email) on success.
    /// </summary>
    public async Task<(string GoogleId, string Email)> ExchangeCodeAsync(
        string code, string callbackUrl)
    {
        // Exchange code → id_token via Google token endpoint
        using var http = new HttpClient();
        var response = await http.PostAsync("https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = _clientId,
                ["client_secret"] = _clientSecret,
                ["redirect_uri"] = callbackUrl,
                ["grant_type"] = "authorization_code",
            }));

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<GoogleTokenResponse>()
                   ?? throw new Exception("Empty Google token response.");

        // Validate the id_token using Google's public keys
        var payload = await GoogleJsonWebSignature.ValidateAsync(json.IdToken,
            new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [_clientId],
            });

        return (payload.Subject, payload.Email);
    }

    private record GoogleTokenResponse(
        string AccessToken,
        string IdToken,
        int ExpiresIn,
        string TokenType,
        string? RefreshToken
    )
    {
        // JSON property names from Google
        [System.Text.Json.Serialization.JsonPropertyName("access_token")]
        public string AccessToken { get; init; } = AccessToken;

        [System.Text.Json.Serialization.JsonPropertyName("id_token")]
        public string IdToken { get; init; } = IdToken;

        [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
        public int ExpiresIn { get; init; } = ExpiresIn;

        [System.Text.Json.Serialization.JsonPropertyName("token_type")]
        public string TokenType { get; init; } = TokenType;

        [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; init; } = RefreshToken;
    }
}
