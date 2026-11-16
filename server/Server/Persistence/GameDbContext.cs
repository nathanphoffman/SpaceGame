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
        model.Entity<GameRow>(entity =>
        {
            entity.ToTable("games");
            entity.HasKey(column => column.Id);
            entity.HasIndex(column => column.Code).IsUnique();
            entity.ComplexProperty(column => column.Json, json =>
            {
                json.Property(column => column.Config).HasColumnName("Config").HasColumnType(JsonColumnType);
                json.Property(column => column.State).HasColumnName("State").HasColumnType(JsonColumnType);
            });

            entity.ComplexProperty(column => column.Times, times =>
            {
                times.Property(column => column.StartedAt).HasColumnName("StartedAt");
                times.Property(column => column.CreatedAt).HasColumnName("CreatedAt");
                times.Property(column => column.UpdatedAt).HasColumnName("UpdatedAt");
            });

            // Version is the optimistic concurrency token: a stale save updates 0 rows and throws.
            entity.Property(column => column.Version).IsConcurrencyToken();
        });

        model.Entity<PlayerRow>(entity =>
        {
            entity.ToTable("players");
            entity.HasKey(column => column.Id);
            entity.HasIndex(column => column.GameId);
            entity.HasIndex(column => column.TokenHash).IsUnique();
            entity.HasOne<GameRow>().WithMany().HasForeignKey(column => column.GameId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<ReportRow>(entity =>
        {
            entity.ToTable("reports");
            entity.HasKey(column => column.Id);
            entity.HasIndex(column => new { column.GameId, column.GameTime });
            entity.Property(column => column.Payload).HasColumnType(JsonColumnType);
            entity.HasOne<GameRow>().WithMany().HasForeignKey(column => column.GameId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
