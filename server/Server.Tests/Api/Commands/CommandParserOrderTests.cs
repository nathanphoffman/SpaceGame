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
    [InlineData("""{"type":"queueShip","planet":"p1","shipType":"Fighter","count":0}""")]
    [InlineData("""{"type":"queueShip","planet":"p1","shipType":"Fighter","count":-2}""")]
    [InlineData("""{"type":"queueShip","planet":"p1","shipType":"Fighter","count":null}""")]
    [InlineData("""{"type":"sendFleet","from":"a","to":"b","ships":null}""")]
    [InlineData("""{"type":"sendFleet","from":"a","to":"b","ships":{}}""")]
    [InlineData("""{"type":"sendFleet","from":"a","to":"b","ships":{"Ufo":1}}""")]
    [InlineData("""{"type":"sendFleet","from":"a","to":"b","ships":{"Scout":0}}""")]
    [InlineData("""{"type":"sendFleet","from":null,"to":"b","ships":{"Scout":1}}""")]
    public void Orders_with_missing_or_invalid_parts_are_rejected(string json)
    {
        Assert.Null(Parse(json).Command);
    }

    private static string Fleet(string from, string ships) =>
        $$"""{"type":"sendFleet","from":{{from}},"to":"b","ships":{{ships}}}""";
}
