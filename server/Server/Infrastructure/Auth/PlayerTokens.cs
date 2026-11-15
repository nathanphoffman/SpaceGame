using System.Security.Cryptography;
using System.Text;

namespace SpaceGame.Server.Auth;

/// <summary>Makes random player tokens and the hashes that are stored instead of them.</summary>
public static class PlayerTokens
{
    private const int TokenBytes = 32;

    public static string NewToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(TokenBytes)).ToLowerInvariant();

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}
