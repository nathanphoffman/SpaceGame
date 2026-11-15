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

    [Theory]
    [InlineData("\"a\"", "null")]
    [InlineData("\"a\"", "{}")]
    [InlineData("\"a\"", """{"Ufo":1}""")]
    [InlineData("\"a\"", """{"Scout":0}""")]
    [InlineData("null", """{"Scout":1}""")]
    public void Send_fleet_rejects_missing_or_invalid_parts(string from, string ships)
    {
        Assert.Null(Parse(Fleet(from, ships)).Command);
    }

    private static string Fleet(string from, string ships) =>
        $$"""{"type":"sendFleet","from":{{from}},"to":"b","ships":{{ships}}}""";
}
