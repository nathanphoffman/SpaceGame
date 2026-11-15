using System.Security.Cryptography;

namespace SpaceGame.Server.Lobby;

/// <summary>Short join codes that are easy to type: no 0, O, 1, I (or L).</summary>
public static class JoinCodes
{
    public const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    public const int Length = 5;

    public static string New()
    {
        Span<char> chars = stackalloc char[Length];

        for (var i = 0; i < Length; i++)
        {
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        return new string(chars);
    }

    public static string Normalize(string? code) => (code ?? "").Trim().ToUpperInvariant();
}
