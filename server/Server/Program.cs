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
builder.Services.AddOpenApi();
builder.Services.AddSingleton(_ => GameEngineFactory.Create());
builder.Services.AddScoped<LobbyService>();
builder.Services.AddSingleton<GameLocks>();
builder.Services.AddScoped<GameSession>();
builder.Services.AddAuthentication(PlayerAuth.Scheme).AddScheme<AuthenticationSchemeOptions, PlayerTokenAuthHandler>(PlayerAuth.Scheme, null);
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi("/openapi.json");
app.MapGet("/health", () => Results.Ok(new HealthResponse("ok"))).WithName("Health");
app.MapGameEndpoints();
app.Run();

public sealed record HealthResponse(string Status);

// Lets the test project start the app with WebApplicationFactory.
public partial class Program;
