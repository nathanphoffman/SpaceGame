using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Api;

namespace SpaceGame.Server.Tests;

public class CommandParserFleetIdTests
{
    private static ParsedCommand Parse(string json) =>
        CommandParser.Parse(JsonSerializer.Deserialize<CommandBody>(json, JsonSerializerOptions.Web));

    [Fact]
    public void Recall_colonize_and_cancel()
    {
        Assert.Equal(new RecallFleet(new FleetId("f1")), Parse("""{"type":"recallFleet","fleet":"f1"}""").Command);
        Assert.Equal(new Colonize(new PlanetId("p1")), Parse("""{"type":"colonize","planet":"p1"}""").Command);
        Assert.Equal(new CancelQueueItem(new PlanetId("p1"), "i"), Parse("""{"type":"cancelQueueItem","planet":"p1","itemId":"i"}""").Command);
    }

    [Theory]
    [InlineData("recallFleet")]
    [InlineData("colonize")]
    [InlineData("cancelQueueItem")]
    public void Missing_ids_are_rejected(string type)
    {
        Assert.Null(Parse($$"""{"type":"{{type}}"}""").Command);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("selfDestruct")]
    public void Unknown_or_missing_type_is_rejected(string? type)
    {
        Assert.Null(Parse($$"""{"type":"{{type}}"}""").Command);
        Assert.Null(CommandParser.Parse(null).Command);
    }
}
