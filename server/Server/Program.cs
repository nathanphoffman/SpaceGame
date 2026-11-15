var app = WebApplication.CreateBuilder(args).Build();
app.MapGet("/health", () => Results.Ok());
app.Run();
