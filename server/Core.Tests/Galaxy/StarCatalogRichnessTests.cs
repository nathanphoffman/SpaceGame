namespace SpaceGame.Core.Tests;

public class StarCatalogRichnessTests
{
    private static Richness Of(string name) =>
        StarCatalog.Systems.SelectMany(s => s.Planets).First(p => p.Name == name).Richness;

    [Fact]
    public void ParseMapsSymbolsToElements()
    {
        var richness = Composition.Parse("Fe30 Si10 O20 H5 Ti6 U2 He3");
        Assert.Equal(new Richness(40, 25, 6, 5), richness);
    }

    [Fact]
    public void ParseRejectsUnknownSymbols() => Assert.Throws<KeyNotFoundException>(() => Composition.Parse("Xx5"));

    [Fact]
    public void EarthIsRichInIronHydrogenTitanium()
    {
        var earth = StarCatalog.Earth.Richness;
        Assert.Equal(new Richness(62, 28, 6, 4), earth);
        Assert.True(earth.Iron > 50 && earth.Hydrogen > 20 && earth.Titanium > 5 && earth.Helium3 <= 5);
    }

    [Theory]
    [InlineData("Jupiter", 9)]
    [InlineData("Saturn", 9)]
    [InlineData("Uranus", 9)]
    [InlineData("Neptune", 9)]
    [InlineData("Epsilon Eridani b", 10)]
    public void GasGiantsHaveHelium3(string name, int atLeast)
    {
        Assert.True(Of(name).Helium3 >= atLeast);
        Assert.True(Of(name).Helium3 > StarCatalog.Earth.Richness.Helium3);
    }

    [Fact]
    public void RockyExoplanetsHaveLittleHelium3() => Assert.True(Of("Proxima b").Helium3 <= 5);

    [Fact]
    public void RichnessOfReadsEachElement()
    {
        var richness = new Richness(1, 2, 3, 4);
        Assert.Equal([1, 2, 3, 4], Enum.GetValues<Element>().Select(richness.Of));
    }
}
