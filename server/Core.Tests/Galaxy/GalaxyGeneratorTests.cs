namespace SpaceGame.Core.Tests;

public class GalaxyGeneratorTests
{
    private static WorldStar StarOf(Galaxy galaxy, WorldPlanet planet) =>
        galaxy.Systems.Single(s => s.Id == planet.System);

    [Fact]
    public void HasTheCatalogSystems() => Assert.Equal(24, GalaxyGenerator.Generate(1).Systems.Count);

    [Fact]
    public void EnemyHomeIsTheBiggestPlanetOfTheFarthestSystem()
    {
        var galaxy = GalaxyGenerator.Generate(1);
        var farthest = galaxy.Systems.MaxBy(s => s.LightYears)!;
        Assert.Equal(farthest.Id, galaxy.EnemyHome.System);
        Assert.Equal(farthest.Planets.Max(p => p.DiameterKm), galaxy.EnemyHome.DiameterKm);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(99)]
    public void ObjectivesAreDistinctInTheBandAndSpread(int seed)
    {
        var galaxy = GalaxyGenerator.Generate(seed);
        var enemyStar = StarOf(galaxy, galaxy.EnemyHome);
        Assert.Equal(GalaxyGenerator.ObjectiveCount, galaxy.Objectives.Select(o => o.Id).Distinct().Count());
        Assert.All(galaxy.Objectives, o => Assert.True(GalaxyGenerator.InObjectiveBand(StarOf(galaxy, o), enemyStar)));
        Assert.True(galaxy.Objectives.Select(o => o.System).Distinct().Count() >= GalaxyGenerator.MinObjectiveSystems);
    }

    [Fact]
    public void SameSeedGivesSameGalaxy() =>
        Assert.Equal(
            GalaxyGenerator.Generate(7).Objectives.Select(o => o.Id),
            GalaxyGenerator.Generate(7).Objectives.Select(o => o.Id));

    [Fact]
    public void MapFlagsObjectives()
    {
        var galaxy = GalaxyGenerator.Generate(3);
        var map = galaxy.ToMap();
        var planets = map.Systems.SelectMany(s => s.Planets).ToList();
        Assert.Equal(GalaxyGenerator.ObjectiveCount, planets.Count(p => p.IsObjective));
        Assert.Equal(galaxy.EnemyHome.Id, map.EnemyHome);
        Assert.Equal(4, planets[0].Richness.Count);
    }
}
