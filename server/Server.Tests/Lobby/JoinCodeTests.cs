using SpaceGame.Server.Auth;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Tests;

public class JoinCodeTests
{
    [Fact]
    public void CodesAreShortWithEasyToTypeCharacters()
    {
        for (var i = 0; i < 200; i++)
        {
            var code = JoinCodes.New();
            Assert.Equal(JoinCodes.Length, code.Length);
            Assert.All(code, c => Assert.Contains(c, JoinCodes.Alphabet));
            Assert.DoesNotContain(code, c => "01OIL".Contains(c));
        }
    }

    [Fact]
    public void TokensAreRandomWithStableHashes()
    {
        var first = PlayerTokens.NewToken();
        Assert.NotEqual(first, PlayerTokens.NewToken());
        Assert.Equal(PlayerTokens.Hash(first), PlayerTokens.Hash(first));
        Assert.NotEqual(first, PlayerTokens.Hash(first));
    }

    [Fact]
    public void BearerHeaderIsParsed()
    {
        Assert.Equal("abc", PlayerAuth.ReadBearer("Bearer abc"));
        Assert.Null(PlayerAuth.ReadBearer("Basic abc"));
        Assert.Null(PlayerAuth.ReadBearer(null));
    }
}
