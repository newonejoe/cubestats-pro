using Microsoft.Data.Sqlite;
using CubeStatsApi.Data;
using CubeStatsApi.Routes;

var builder = WebApplication.CreateSlimBuilder(args);

// Set explicit web root path to wwwroot folder
builder.WebHost.UseWebRoot("wwwroot");

// Configure SQLite connection
var connectionString = "Data Source=cubestats.db";
builder.Services.AddSingleton(sp => new SqliteConnection(connectionString));

// Configure CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure JSON serialization with AOT-compatible context
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Add(CubeStatsApi.JsonContext.Default);
});

var app = builder.Build();

// Enable CORS
app.UseCors();

// Serve static files from wwwroot - use default index.html
var options = new DefaultFilesOptions();
options.DefaultFileNames.Clear();
options.DefaultFileNames.Add("index.html");
app.UseDefaultFiles(options);
app.UseStaticFiles();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var conn = scope.ServiceProvider.GetRequiredService<SqliteConnection>();
    DatabaseExtensions.InitializeDatabase(conn);
}

// Map API routes
app.MapUsersRoutes();
app.MapSessionsRoutes();
app.MapSolvesRoutes();
app.MapAnalysisRoutes();

app.Run();
