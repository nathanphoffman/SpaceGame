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
        var a = PlayerTokens.NewToken();
        Assert.NotEqual(a, PlayerTokens.NewToken());
        Assert.Equal(PlayerTokens.Hash(a), PlayerTokens.Hash(a));
        Assert.NotEqual(a, PlayerTokens.Hash(a));
    }

    [Fact]
    public void BearerHeaderIsParsed()
    {
        Assert.Equal("abc", PlayerAuth.ReadBearer("Bearer abc"));
        Assert.Null(PlayerAuth.ReadBearer("Basic abc"));
        Assert.Null(PlayerAuth.ReadBearer(null));
    }
}
