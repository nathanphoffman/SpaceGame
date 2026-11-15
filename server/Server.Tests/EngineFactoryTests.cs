using SpaceGame.Core;

namespace SpaceGame.Server.Tests;

public class EngineFactoryTests
{
    [Fact]
    public void FactoryReturnsAnEngine() => Assert.NotNull(GameEngineFactory.Create());
}
