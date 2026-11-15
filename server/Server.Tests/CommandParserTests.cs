using SpaceGame.Core;
using SpaceGame.Server.Api;

namespace SpaceGame.Server.Tests;

public class CommandParserTests
{
    private static readonly CommandBody Empty = new(null, null, null, null, null, null, null, null, null, null, null, null, null);

    private static ParsedCommand Parse(CommandBody body) => CommandParser.Parse(body);

    [Fact]
    public void Build_mine_with_element()
    {
        var parsed = Parse(Empty with { Type = "buildBuilding", Planet = "p1", BuildingType = "Mine", Element = "Iron" });
        Assert.Equal(new BuildBuilding(new PlanetId("p1"), BuildingType.Mine, Element.Iron), parsed.Command);
    }

    [Fact]
    public void Build_shipyard_without_element()
    {
        var parsed = Parse(Empty with { Type = "buildBuilding", Planet = "p1", BuildingType = "Shipyard" });
        Assert.Equal(new BuildBuilding(new PlanetId("p1"), BuildingType.Shipyard, null), parsed.Command);
    }

    [Theory]
    [InlineData("Mine", null)]
    [InlineData("Shipyard", "Iron")]
    [InlineData("Mine", "Gold")]
    [InlineData("Mine", "1")]
    [InlineData("Nope", null)]
    public void Build_rejects_bad_element_combinations(string building, string? element)
    {
        var parsed = Parse(Empty with { Type = "buildBuilding", Planet = "p1", BuildingType = building, Element = element });
        Assert.Null(parsed.Command);
        Assert.NotNull(parsed.Error);
    }

    [Fact]
    public void Queue_ship()
    {
        var parsed = Parse(Empty with { Type = "queueShip", Planet = "p1", ShipType = "fighter", Count = 3 });
        Assert.Equal(new QueueShip(new PlanetId("p1"), ShipType.Fighter, 3), parsed.Command);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    [InlineData(null)]
    public void Queue_ship_rejects_bad_count(int? count)
    {
        Assert.Null(Parse(Empty with { Type = "queueShip", Planet = "p1", ShipType = "Fighter", Count = count }).Command);
    }

    [Fact]
    public void Start_upgrade()
    {
        Assert.Equal(new StartUpgrade(UpgradeType.Armor), Parse(Empty with { Type = "startUpgrade", UpgradeType = "Armor" }).Command);
        Assert.Null(Parse(Empty with { Type = "startUpgrade", UpgradeType = "Magic" }).Command);
    }

    [Fact]
    public void Send_fleet()
    {
        var body = Empty with { Type = "sendFleet", From = "a", To = "b", Ships = new() { ["Scout"] = 2 } };
        var send = Assert.IsType<SendFleet>(Parse(body).Command);
        Assert.Equal(2, send.Ships[ShipType.Scout]);
        Assert.Equal(new PlanetId("b"), send.To);
    }

    [Fact]
    public void Send_fleet_rejects_empty_unknown_and_zero_ships()
    {
        var body = Empty with { Type = "sendFleet", From = "a", To = "b" };
        Assert.Null(Parse(body).Command);
        Assert.Null(Parse(body with { Ships = [] }).Command);
        Assert.Null(Parse(body with { Ships = new() { ["Ufo"] = 1 } }).Command);
        Assert.Null(Parse(body with { Ships = new() { ["Scout"] = 0 } }).Command);
        Assert.Null(Parse(body with { From = null, Ships = new() { ["Scout"] = 1 } }).Command);
    }

    [Fact]
    public void Recall_colonize_and_cancel()
    {
        Assert.Equal(new RecallFleet(new FleetId("f1")), Parse(Empty with { Type = "recallFleet", Fleet = "f1" }).Command);
        Assert.Equal(new Colonize(new PlanetId("p1")), Parse(Empty with { Type = "colonize", Planet = "p1" }).Command);
        Assert.Equal(new CancelQueueItem(new PlanetId("p1"), "i"), Parse(Empty with { Type = "cancelQueueItem", Planet = "p1", ItemId = "i" }).Command);
    }

    [Theory]
    [InlineData("recallFleet")]
    [InlineData("colonize")]
    [InlineData("cancelQueueItem")]
    public void Missing_ids_are_rejected(string type)
    {
        Assert.Null(Parse(Empty with { Type = type }).Command);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("selfDestruct")]
    public void Unknown_or_missing_type_is_rejected(string? type)
    {
        Assert.Null(Parse(Empty with { Type = type }).Command);
        Assert.Null(CommandParser.Parse(null).Command);
    }
}
