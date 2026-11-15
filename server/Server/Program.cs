using Microsoft.AspNetCore.Authentication;
using SpaceGame.Core;
using SpaceGame.Server;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Game;
using SpaceGame.Server.Api;
using SpaceGame.Server.Persistence;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IClock, SpaceGame.Server.SystemClock>();
builder.Services.AddProblemDetails();
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddOpenApi(options => options.AddSchemaTransformer(FlatCommandBodySchema.Transform).AddSchemaTransformer(IdSchema.Transform));
builder.Services.AddSingleton(_ => GameEngineFactory.Create());
builder.Services.AddScoped<LobbyService>();
builder.Services.AddSingleton<GameLocks>();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IGameNotifier, SpaceGame.Server.Hubs.SignalRGameNotifier>();
builder.Services.AddHttpClient<SpaceGame.Server.Discord.IDiscordNotifier, SpaceGame.Server.Discord.DiscordNotifier>(c => c.Timeout = SpaceGame.Server.Discord.DiscordNotifier.RequestTimeout);
builder.Services.AddScoped<GameSession>();
builder.Services.AddSingleton<GameClock>();
builder.Services.Configure<GameClockOptions>(builder.Configuration.GetSection(GameClockOptions.Section));
builder.Services.AddHostedService<GameClockService>();
builder.Services.AddAuthentication(PlayerAuth.Scheme).AddScheme<AuthenticationSchemeOptions, PlayerTokenAuthHandler>(PlayerAuth.Scheme, null);
builder.Services.AddAuthorization();

var app = builder.Build();
app.MigrateDatabaseOnStart();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi("/openapi.json");
app.MapGet("/health", () => Results.Ok(new HealthResponse("ok"))).WithName("Health");
app.MapGameEndpoints();
app.MapHub<SpaceGame.Server.Hubs.GameHub>("/hubs/game");
app.Run();

public sealed record HealthResponse(string Status);

// Lets the test project start the app with WebApplicationFactory.
public partial class Program;
