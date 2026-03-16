using Microsoft.Data.Sqlite;
using CubeStatsApi;
using CubeStatsApi.Data;

namespace CubeStatsApi.Routes;

public static class SessionsRoutes
{
    public static void MapSessionsRoutes(this WebApplication app)
    {
        app.MapGet("/api/sessions", async (int? userId, SqliteConnection conn) =>
        {
            if (userId.HasValue)
            {
                var sessions = await conn.QueryAsync("SELECT s.Id, s.UserId, s.Name, s.StartTime, s.EndTime, s.SolveCount, s.AverageTime, s.BestTime, u.Username FROM Sessions s JOIN Users u ON s.UserId = u.Id WHERE s.UserId = @UserId ORDER BY s.StartTime DESC",
                    r => new SessionResponse2(r.GetInt32(0), r.GetInt32(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4), r.GetInt32(5), r.IsDBNull(6) ? null : (decimal)r.GetDouble(6), r.IsDBNull(7) ? null : (decimal)r.GetDouble(7), new UserSummary(r.GetInt32(1), r.GetString(8))),
                    new[] { new SqliteParameter("@UserId", userId.Value) });
                return Results.Ok(sessions);
            }
            else
            {
                var sessions = await conn.QueryAsync("SELECT s.Id, s.UserId, s.Name, s.StartTime, s.EndTime, s.SolveCount, s.AverageTime, s.BestTime, u.Username FROM Sessions s JOIN Users u ON s.UserId = u.Id ORDER BY s.StartTime DESC",
                    r => new SessionResponse2(r.GetInt32(0), r.GetInt32(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4), r.GetInt32(5), r.IsDBNull(6) ? null : (decimal)r.GetDouble(6), r.IsDBNull(7) ? null : (decimal)r.GetDouble(7), new UserSummary(r.GetInt32(1), r.GetString(8))));
                return Results.Ok(sessions);
            }
        });

        app.MapGet("/api/sessions/{id}", async (int id, SqliteConnection conn) =>
        {
            var session = await conn.QuerySingleAsync("SELECT s.Id, s.UserId, s.Name, s.StartTime, s.EndTime, s.SolveCount, s.AverageTime, s.BestTime, u.Username FROM Sessions s JOIN Users u ON s.UserId = u.Id WHERE s.Id = @Id",
                r => new SessionResponse2(r.GetInt32(0), r.GetInt32(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4), r.GetInt32(5), r.IsDBNull(6) ? null : (decimal)r.GetDouble(6), r.IsDBNull(7) ? null : (decimal)r.GetDouble(7), new UserSummary(r.GetInt32(1), r.GetString(8))),
                new[] { new SqliteParameter("@Id", id) });
            if (session == null) return Results.NotFound();

            var solves = await conn.QueryAsync("SELECT Id, SessionId, StartTime, EndTime, Time, FinalTime, Penalty, Scramble, MoveCount FROM Solves WHERE SessionId = @SessionId ORDER BY StartTime",
                r => new Solve(r.GetInt32(0), r.GetInt32(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetInt64(4), r.IsDBNull(5) ? null : r.GetInt64(5), r.IsDBNull(6) ? null : r.GetInt32(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetInt32(8)),
                new[] { new SqliteParameter("@SessionId", id) });

            return Results.Ok(new SessionDetailResponse(session.Id, session.UserId, session.Name, session.StartTime!, session.EndTime, session.SolveCount, session.AverageTime, session.BestTime, session.User, solves));
        });

        app.MapPost("/api/sessions", async (Session session, SqliteConnection conn) =>
        {
            session = session with { StartTime = DateTime.UtcNow.ToString("o") };
            session = session with { Id = await conn.ExecuteWithLastIdAsync("INSERT INTO Sessions (UserId, Name, StartTime, SolveCount) VALUES (@UserId, @Name, @StartTime, 0)",
                new[] { new SqliteParameter("@UserId", session.UserId), new SqliteParameter("@Name", session.Name ?? (object)DBNull.Value), new SqliteParameter("@StartTime", session.StartTime) }) };

            return Results.Created($"/api/sessions/{session.Id}", session);
        });

        app.MapPut("/api/sessions/{id}", async (int id, Session session, SqliteConnection conn) =>
        {
            if (id != session.Id) return Results.BadRequest();

            var solves = await conn.QueryAsync("SELECT FinalTime FROM Solves WHERE SessionId = @SessionId AND FinalTime IS NOT NULL",
                r => r.IsDBNull(0) ? (long?)null : r.GetInt64(0),
                new[] { new SqliteParameter("@SessionId", id) });

            long? bestTime = solves.Where(s => s.HasValue).Min(s => s);
            double? avgTime = solves.Where(s => s.HasValue).Any() ? solves.Where(s => s.HasValue).Average(s => s!.Value) : null;

            var rows = await conn.ExecuteAsync("UPDATE Sessions SET Name = @Name, EndTime = @EndTime, SolveCount = @SolveCount, BestTime = @BestTime, AverageTime = @AverageTime WHERE Id = @Id",
                new[] {
                    new SqliteParameter("@Name", session.Name ?? (object)DBNull.Value),
                    new SqliteParameter("@EndTime", session.EndTime ?? (object)DBNull.Value),
                    new SqliteParameter("@SolveCount", solves.Count(s => s.HasValue)),
                    new SqliteParameter("@BestTime", bestTime.HasValue ? (object)bestTime.Value : DBNull.Value),
                    new SqliteParameter("@AverageTime", avgTime.HasValue ? (object)avgTime.Value : DBNull.Value),
                    new SqliteParameter("@Id", id)
                });
            if (rows == 0) return Results.NotFound();
            return Results.NoContent();
        });

        app.MapDelete("/api/sessions/{id}", async (int id, SqliteConnection conn) =>
        {
            await conn.ExecuteAsync("DELETE FROM Solves WHERE SessionId = @Id", new[] { new SqliteParameter("@Id", id) });
            var rows = await conn.ExecuteAsync("DELETE FROM Sessions WHERE Id = @Id", new[] { new SqliteParameter("@Id", id) });
            if (rows == 0) return Results.NotFound();
            return Results.NoContent();
        });

        app.MapGet("/api/sessions/{id}/solves", async (int id, SqliteConnection conn) =>
        {
            var solves = await conn.QueryAsync("SELECT Id, SessionId, StartTime, EndTime, Time, FinalTime, Penalty, Scramble, MoveCount, CubeState, OStepTime, PStepTime, CrossTime, F2LPairCount, PLLCase, PLLRecognitionTime, OStepEfficiency, PStepEfficiency FROM Solves WHERE SessionId = @SessionId ORDER BY StartTime",
                r => new SolveResponse(r.GetInt32(0), r.GetInt32(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetInt64(4), r.IsDBNull(5) ? null : r.GetInt64(5), r.IsDBNull(6) ? null : r.GetInt32(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetInt32(8), r.IsDBNull(9) ? null : r.GetString(9), r.IsDBNull(10) ? null : r.GetInt64(10), r.IsDBNull(11) ? null : r.GetInt64(11), r.IsDBNull(12) ? null : r.GetInt64(12), r.GetInt32(13), r.IsDBNull(14) ? null : r.GetString(14), r.IsDBNull(15) ? null : r.GetInt64(15), r.IsDBNull(16) ? null : r.GetString(16), r.IsDBNull(17) ? null : r.GetString(17)),
                new[] { new SqliteParameter("@SessionId", id) });
            return Results.Ok(solves);
        });
    }
}
