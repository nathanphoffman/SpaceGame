using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Api;

namespace SpaceGame.Server.Tests;

public class CommandParserOrderTests
{
    private static ParsedCommand Parse(string json) =>
        CommandParser.Parse(JsonSerializer.Deserialize<CommandBody>(json, JsonSerializerOptions.Web));

    [Fact]
    public void Queue_ship()
    {
        var parsed = Parse("""{"type":"queueShip","planet":"p1","shipType":"fighter","count":3}""");
        Assert.Equal(new QueueShip(new PlanetId("p1"), ShipType.Fighter, 3), parsed.Command);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-2")]
    [InlineData("null")]
    public void Queue_ship_rejects_bad_count(string count)
    {
        Assert.Null(Parse($$"""{"type":"queueShip","planet":"p1","shipType":"Fighter","count":{{count}}}""").Command);
    }

    [Fact]
    public void Start_upgrade()
    {
        Assert.Equal(new StartUpgrade(UpgradeType.Armor), Parse("""{"type":"startUpgrade","upgradeType":"Armor"}""").Command);
        Assert.Null(Parse("""{"type":"startUpgrade","upgradeType":"Magic"}""").Command);
    }

    [Fact]
    public void Send_fleet()
    {
        var send = Assert.IsType<SendFleet>(Parse(Fleet("\"a\"", """{"Scout":2}""")).Command);
        Assert.Equal(2, send.Ships[ShipType.Scout]);
        Assert.Equal(new PlanetId("b"), send.To);
    }

    [Fact]
    public void Send_fleet_rejects_empty_unknown_and_zero_ships()
    {
        Assert.Null(Parse(Fleet("\"a\"", "null")).Command);
        Assert.Null(Parse(Fleet("\"a\"", "{}")).Command);
        Assert.Null(Parse(Fleet("\"a\"", """{"Ufo":1}""")).Command);
        Assert.Null(Parse(Fleet("\"a\"", """{"Scout":0}""")).Command);
        Assert.Null(Parse(Fleet("null", """{"Scout":1}""")).Command);
    }

    private static string Fleet(string from, string ships) =>
        $$"""{"type":"sendFleet","from":{{from}},"to":"b","ships":{{ships}}}""";

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
