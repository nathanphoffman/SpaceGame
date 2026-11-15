using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Api;

namespace SpaceGame.Server.Tests;

public class CommandParserBuildTests
{
    private static ParsedCommand Parse(string json) =>
        CommandParser.Parse(JsonSerializer.Deserialize<CommandBody>(json, JsonSerializerOptions.Web));

    [Fact]
    public void Build_mine_with_element()
    {
        var parsed = Parse("""{"type":"buildBuilding","planet":"p1","buildingType":"Mine","element":"Iron"}""");
        Assert.Equal(new BuildBuilding(new PlanetId("p1"), BuildingType.Mine, Element.Iron), parsed.Command);
    }

    [Fact]
    public void Build_shipyard_without_element()
    {
        var parsed = Parse("""{"type":"buildBuilding","planet":"p1","buildingType":"Shipyard"}""");
        Assert.Equal(new BuildBuilding(new PlanetId("p1"), BuildingType.Shipyard, null), parsed.Command);
    }

    [Theory]
    [InlineData("Mine", "null")]
    [InlineData("Shipyard", "\"Iron\"")]
    [InlineData("Mine", "\"Gold\"")]
    [InlineData("Mine", "\"1\"")]
    [InlineData("Nope", "null")]
    public void Build_rejects_bad_element_combinations(string building, string element)
    {
        var parsed = Parse($$"""{"type":"buildBuilding","planet":"p1","buildingType":"{{building}}","element":{{element}}}""");
        Assert.Null(parsed.Command);
        Assert.NotNull(parsed.Error);
    }

    [Fact]
    public void Body_round_trips_as_flat_json()
    {
        var body = JsonSerializer.Deserialize<CommandBody>("""{"type":"queueShip","planet":"p1","count":3}""", JsonSerializerOptions.Web)!;
        var flat = JsonSerializer.SerializeToElement(body, JsonSerializerOptions.Web);
        Assert.Equal("p1", flat.GetProperty("planet").GetString());
        Assert.Equal(3, flat.GetProperty("count").GetInt32());
        Assert.False(flat.TryGetProperty("target", out _));
    }
}
