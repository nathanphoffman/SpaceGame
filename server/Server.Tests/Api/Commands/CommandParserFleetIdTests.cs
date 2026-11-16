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
    [InlineData("""{"type":"recallFleet"}""")]
    [InlineData("""{"type":"colonize"}""")]
    [InlineData("""{"type":"cancelQueueItem"}""")]
    [InlineData("""{"type":null}""")]
    [InlineData("""{"type":""}""")]
    [InlineData("""{"type":"selfDestruct"}""")]
    public void Missing_ids_and_unknown_types_are_rejected(string json)
    {
        Assert.Null(Parse(json).Command);
    }

    [Fact]
    public void Missing_body_is_rejected() => Assert.Null(CommandParser.Parse(null).Command);
}
