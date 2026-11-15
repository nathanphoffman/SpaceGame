namespace SpaceGame.Core.Tests;

public class StarCatalogTests
{
    private static Richness Of(string name) =>
        StarCatalog.Systems.SelectMany(s => s.Planets).First(p => p.Name == name).Richness;

    [Fact]
    public void HasTwentyFourSystemsStartingWithSol()
    {
        Assert.Equal(24, StarCatalog.Systems.Count);
        Assert.Equal("Sol", StarCatalog.Systems[0].Name);
        Assert.Equal(0, StarCatalog.Sol.LightYears);
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
    public void SolHasTheNinePlanets() => Assert.Equal(9, StarCatalog.Sol.Planets.Count);

    [Fact]
    public void PositionsMatchTheDistance()
    {
        foreach (var star in StarCatalog.Systems)
            Assert.InRange(Math.Sqrt(star.X * star.X + star.Y * star.Y), 0, star.LightYears + 0.01);
    }

    [Fact]
    public void ParseMapsSymbolsToElements()
    {
        var richness = Composition.Parse("Fe30 Si10 O20 H5 Ti6 U2 He3");
        Assert.Equal(new Richness(40, 25, 6, 5), richness);
    }

    [Fact]
    public void ParseRejectsUnknownSymbols() => Assert.Throws<KeyNotFoundException>(() => Composition.Parse("Xx5"));

    [Fact]
    public void EarthIsRichInIronHydrogenAndTitaniumWithAlmostNoHelium3()
    {
        var earth = StarCatalog.Earth.Richness;
        Assert.Equal(new Richness(62, 28, 6, 4), earth);
        Assert.True(earth.Iron > 50 && earth.Hydrogen > 20 && earth.Titanium > 5 && earth.Helium3 <= 5);
    }

    [Theory]
    [InlineData("Jupiter")]
    [InlineData("Saturn")]
    [InlineData("Uranus")]
    [InlineData("Neptune")]
    public void SolGasGiantsHaveHelium3(string name)
    {
        Assert.True(Of(name).Helium3 >= 9);
        Assert.True(Of(name).Helium3 > StarCatalog.Earth.Richness.Helium3);
    }

    [Fact]
    public void ExoplanetGasGiantsHaveHelium3AndRockyOnesDoNot()
    {
        Assert.True(Of("Epsilon Eridani b").Helium3 >= 10);
        Assert.True(Of("Proxima b").Helium3 <= 5);
    }

    [Fact]
    public void RichnessOfReadsEachElement()
    {
        var richness = new Richness(1, 2, 3, 4);
        Assert.Equal([1, 2, 3, 4], Enum.GetValues<Element>().Select(richness.Of));
    }
}
