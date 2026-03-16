using Microsoft.Data.Sqlite;
using CubeStatsApi.Data;

namespace CubeStatsApi.Routes;

public static class UsersRoutes
{
    public static void MapUsersRoutes(this WebApplication app)
    {
        app.MapGet("/api/users", async (SqliteConnection conn) =>
        {
            var users = await conn.QueryAsync("SELECT Id, Username, Email, Role, CreatedAt, LastLoginAt FROM Users",
                r => new User(r.GetInt32(0), r.GetString(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetInt32(3), r.GetString(4), r.IsDBNull(5) ? null : r.GetString(5)));
            return Results.Ok(users);
        });

        app.MapGet("/api/users/{id}", async (int id, SqliteConnection conn) =>
        {
            var user = await conn.QuerySingleAsync("SELECT Id, Username, Email, Role, CreatedAt, LastLoginAt FROM Users WHERE Id = @Id",
                r => new User(r.GetInt32(0), r.GetString(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetInt32(3), r.GetString(4), r.IsDBNull(5) ? null : r.GetString(5)),
                new[] { new SqliteParameter("@Id", id) });
            if (user == null) return Results.NotFound();
            return Results.Ok(user);
        });

        app.MapPost("/api/users", async (User user, SqliteConnection conn) =>
        {
            var exists = await conn.QuerySingleAsync("SELECT Id FROM Users WHERE Username = @Username",
                r => r.GetInt32(0), new[] { new SqliteParameter("@Username", user.Username) });
            if (exists != 0) return Results.BadRequest("Username already exists");

            user = user with { CreatedAt = DateTime.UtcNow.ToString("o") };
            user = user with { Id = await conn.ExecuteWithLastIdAsync("INSERT INTO Users (Username, Email, Role, CreatedAt) VALUES (@Username, @Email, @Role, @CreatedAt)",
                new[] { new SqliteParameter("@Username", user.Username), new SqliteParameter("@Email", user.Email ?? (object)DBNull.Value), new SqliteParameter("@Role", user.Role), new SqliteParameter("@CreatedAt", user.CreatedAt) }) };

            return Results.Created($"/api/users/{user.Id}", user);
        });

        app.MapPut("/api/users/{id}", async (int id, User user, SqliteConnection conn) =>
        {
            if (id != user.Id) return Results.BadRequest();
            var rows = await conn.ExecuteAsync("UPDATE Users SET Username = @Username, Email = @Email, Role = @Role WHERE Id = @Id",
                new[] { new SqliteParameter("@Username", user.Username), new SqliteParameter("@Email", user.Email ?? (object)DBNull.Value), new SqliteParameter("@Role", user.Role), new SqliteParameter("@Id", id) });
            if (rows == 0) return Results.NotFound();
            return Results.NoContent();
        });

        app.MapGet("/api/users/{id}/sessions", async (int id, SqliteConnection conn) =>
        {
            var sessions = await conn.QueryAsync("SELECT Id, UserId, Name, StartTime, EndTime, SolveCount, AverageTime, BestTime FROM Sessions WHERE UserId = @UserId ORDER BY StartTime DESC",
                r => new Session(r.GetInt32(0), r.GetInt32(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4), r.GetInt32(5), r.IsDBNull(6) ? null : (decimal)r.GetDouble(6), r.IsDBNull(7) ? null : (decimal)r.GetDouble(7)),
                new[] { new SqliteParameter("@UserId", id) });
            return Results.Ok(sessions);
        });
    }
}
