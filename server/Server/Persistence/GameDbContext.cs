using Microsoft.EntityFrameworkCore;

namespace SpaceGame.Server.Persistence;

public sealed class GameDbContext(DbContextOptions<GameDbContext> options) : DbContext(options)
{
    private const string JsonColumnType = "jsonb";

    public DbSet<GameRow> Games => Set<GameRow>();
    public DbSet<PlayerRow> Players => Set<PlayerRow>();
    public DbSet<ReportRow> Reports => Set<ReportRow>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<GameRow>(e =>
        {
            e.ToTable("games");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
            e.ComplexProperty(x => x.Json, j =>
            {
                j.Property(x => x.Config).HasColumnName("Config").HasColumnType(JsonColumnType);
                j.Property(x => x.State).HasColumnName("State").HasColumnType(JsonColumnType);
            });

            e.ComplexProperty(x => x.Times, t =>
            {
                t.Property(x => x.StartedAt).HasColumnName("StartedAt");
                t.Property(x => x.CreatedAt).HasColumnName("CreatedAt");
                t.Property(x => x.UpdatedAt).HasColumnName("UpdatedAt");
            });

            // Version is the optimistic concurrency token: a stale save updates 0 rows and throws.
            e.Property(x => x.Version).IsConcurrencyToken();
        });

        model.Entity<PlayerRow>(e =>
        {
            e.ToTable("players");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.GameId);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasOne<GameRow>().WithMany().HasForeignKey(x => x.GameId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<ReportRow>(e =>
        {
            e.ToTable("reports");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.GameId, x.GameTime });
            e.Property(x => x.Payload).HasColumnType(JsonColumnType);
            e.HasOne<GameRow>().WithMany().HasForeignKey(x => x.GameId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
