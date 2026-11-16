namespace SpaceGame.Core.Tests;

public class StarCatalogLayoutTests
{
    [Fact]
    public void CatalogStartsWithSol()
    {
        Assert.Equal(24, StarCatalog.Systems.Count);
        Assert.Equal("Sol", StarCatalog.Systems[0].Name);
        Assert.Equal(0, StarCatalog.Sol.LightYears);
        Assert.Equal(9, StarCatalog.Sol.Planets.Count);
    }

    [Fact]
    public void SystemsAreSortedByDistanceFromSol() =>
        Assert.Equal(StarCatalog.Systems.Select(s => s.LightYears).Order(), StarCatalog.Systems.Select(s => s.LightYears));

    [Fact]
    public void IdsAreUnique()
    {
        var planets = StarCatalog.Systems.SelectMany(s => s.Planets).ToList();
        Assert.Equal(planets.Count, planets.Select(p => p.Id).Distinct().Count());
        Assert.Equal(24, StarCatalog.Systems.Select(s => s.Id).Distinct().Count());
    }

    [Fact]
    public void PositionsMatchTheDistance()
    {
        foreach (var star in StarCatalog.Systems)
            Assert.InRange(Math.Sqrt(star.X * star.X + star.Y * star.Y), 0, star.LightYears + 0.01);
    }
}
