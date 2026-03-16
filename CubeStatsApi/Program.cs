using Microsoft.EntityFrameworkCore;
using CubeStatsApi.Data;

var builder = WebApplication.CreateBuilder(args);

// Set explicit web root path to wwwroot folder
builder.WebHost.UseWebRoot("wwwroot");

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure SQLite database
var connectionString = "Data Source=cubestats.db";
builder.Services.AddDbContext<CubeDbContext>(options =>
    options.UseSqlite(connectionString));

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

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Enable CORS
app.UseCors();

// Serve static files from wwwroot - use default index.html
var options = new DefaultFilesOptions();
options.DefaultFileNames.Clear();
options.DefaultFileNames.Add("index.html");
app.UseDefaultFiles(options);
app.UseStaticFiles();

// Map controllers
app.MapControllers();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<CubeDbContext>();
    context.Database.EnsureCreated();
}

app.Run();
