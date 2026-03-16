using Microsoft.Data.Sqlite;
using CubeStatsApi.Data;

namespace CubeStatsApi.Routes;

public static class SolvesRoutes
{
    public static void MapSolvesRoutes(this WebApplication app)
    {
        app.MapGet("/api/solves", async (int? sessionId, int? userId, SqliteConnection conn) =>
        {
            if (userId.HasValue)
            {
                var solves = await conn.QueryAsync("SELECT s.Id, s.SessionId, s.StartTime, s.EndTime, s.Time, s.FinalTime, s.Penalty, s.Scramble, s.MoveCount FROM Solves s JOIN Sessions ss ON s.SessionId = ss.Id WHERE ss.UserId = @UserId ORDER BY s.StartTime DESC",
                    r => new Solve(r.GetInt32(0), r.GetInt32(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetInt64(4), r.IsDBNull(5) ? null : r.GetInt64(5), r.IsDBNull(6) ? null : r.GetInt32(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetInt32(8)),
                    new[] { new SqliteParameter("@UserId", userId.Value) });
                return Results.Ok(solves);
            }
            else if (sessionId.HasValue)
            {
                var solves = await conn.QueryAsync("SELECT Id, SessionId, StartTime, EndTime, Time, FinalTime, Penalty, Scramble, MoveCount FROM Solves WHERE SessionId = @SessionId ORDER BY StartTime DESC",
                    r => new Solve(r.GetInt32(0), r.GetInt32(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetInt64(4), r.IsDBNull(5) ? null : r.GetInt64(5), r.IsDBNull(6) ? null : r.GetInt32(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetInt32(8)),
                    new[] { new SqliteParameter("@SessionId", sessionId.Value) });
                return Results.Ok(solves);
            }
            else
            {
                var solves = await conn.QueryAsync("SELECT Id, SessionId, StartTime, EndTime, Time, FinalTime, Penalty, Scramble, MoveCount FROM Solves ORDER BY StartTime DESC",
                    r => new Solve(r.GetInt32(0), r.GetInt32(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetInt64(4), r.IsDBNull(5) ? null : r.GetInt64(5), r.IsDBNull(6) ? null : r.GetInt32(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetInt32(8)));
                return Results.Ok(solves);
            }
        });

        app.MapGet("/api/solves/{id}", async (int id, SqliteConnection conn) =>
        {
            var solve = await conn.QuerySingleAsync("SELECT Id, SessionId, StartTime, EndTime, Time, FinalTime, Penalty, Scramble, MoveCount, CubeState, OStepTime, PStepTime, CrossTime, F2LPairCount, PLLCase, PLLRecognitionTime, OStepEfficiency, PStepEfficiency FROM Solves WHERE Id = @Id",
                r => new SolveResponse(r.GetInt32(0), r.GetInt32(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.IsDBNull(4) ? null : r.GetInt64(4), r.IsDBNull(5) ? null : r.GetInt64(5), r.IsDBNull(6) ? null : r.GetInt32(6), r.IsDBNull(7) ? null : r.GetString(7), r.GetInt32(8), r.IsDBNull(9) ? null : r.GetString(9), r.IsDBNull(10) ? null : r.GetInt64(10), r.IsDBNull(11) ? null : r.GetInt64(11), r.IsDBNull(12) ? null : r.GetInt64(12), r.GetInt32(13), r.IsDBNull(14) ? null : r.GetString(14), r.IsDBNull(15) ? null : r.GetInt64(15), r.IsDBNull(16) ? null : r.GetString(16), r.IsDBNull(17) ? null : r.GetString(17)),
                new[] { new SqliteParameter("@Id", id) });
            if (solve == null) return Results.NotFound();
            return Results.Ok(solve);
        });

        app.MapPost("/api/solves", async (Solve solve, SqliteConnection conn) =>
        {
            solve = solve with { StartTime = DateTime.UtcNow.ToString("o") };
            solve = solve with { Id = await conn.ExecuteWithLastIdAsync(@"INSERT INTO Solves (SessionId, StartTime, Time, FinalTime, Penalty, Scramble, MoveCount, CubeState, OStepTime, PStepTime, CrossTime, F2LPairCount, PLLCase, PLLRecognitionTime, OStepEfficiency, PStepEfficiency)
                VALUES (@SessionId, @StartTime, @Time, @FinalTime, @Penalty, @Scramble, @MoveCount, @CubeState, @OStepTime, @PStepTime, @CrossTime, @F2LPairCount, @PLLCase, @PLLRecognitionTime, @OStepEfficiency, @PStepEfficiency)",
                new[] {
                    new SqliteParameter("@SessionId", solve.SessionId),
                    new SqliteParameter("@StartTime", solve.StartTime),
                    new SqliteParameter("@Time", solve.Time ?? (object)DBNull.Value),
                    new SqliteParameter("@FinalTime", solve.FinalTime ?? (object)DBNull.Value),
                    new SqliteParameter("@Penalty", solve.Penalty.HasValue ? (object)solve.Penalty.Value : DBNull.Value),
                    new SqliteParameter("@Scramble", solve.Scramble ?? (object)DBNull.Value),
                    new SqliteParameter("@MoveCount", solve.MoveCount),
                    new SqliteParameter("@CubeState", (object?)null),
                    new SqliteParameter("@OStepTime", (object?)null),
                    new SqliteParameter("@PStepTime", (object?)null),
                    new SqliteParameter("@CrossTime", (object?)null),
                    new SqliteParameter("@F2LPairCount", 0),
                    new SqliteParameter("@PLLCase", (object?)null),
                    new SqliteParameter("@PLLRecognitionTime", (object?)null),
                    new SqliteParameter("@OStepEfficiency", (object?)null),
                    new SqliteParameter("@PStepEfficiency", (object?)null)
                }) };

            // Update session stats
            var times = await conn.QueryAsync("SELECT FinalTime FROM Solves WHERE SessionId = @SessionId AND FinalTime IS NOT NULL",
                r => r.IsDBNull(0) ? (long?)null : r.GetInt64(0),
                new[] { new SqliteParameter("@SessionId", solve.SessionId) });

            long? bestTime = times.Where(t => t.HasValue).Min(t => t);
            double? avgTime = times.Where(t => t.HasValue).Any() ? times.Where(t => t.HasValue).Average(t => t!.Value) : null;

            await conn.ExecuteAsync("UPDATE Sessions SET SolveCount = @SolveCount, BestTime = @BestTime, AverageTime = @AverageTime WHERE Id = @Id",
                new[] {
                    new SqliteParameter("@SolveCount", times.Count(t => t.HasValue)),
                    new SqliteParameter("@BestTime", bestTime.HasValue ? (object)bestTime.Value : DBNull.Value),
                    new SqliteParameter("@AverageTime", avgTime.HasValue ? (object)avgTime.Value : DBNull.Value),
                    new SqliteParameter("@Id", solve.SessionId)
                });

            return Results.Created($"/api/solves/{solve.Id}", solve);
        });

        app.MapPut("/api/solves/{id}", async (int id, SolveResponse solve, SqliteConnection conn) =>
        {
            if (id != solve.Id) return Results.BadRequest();

            var rows = await conn.ExecuteAsync(@"UPDATE Solves SET EndTime = @EndTime, Time = @Time, FinalTime = @FinalTime, Penalty = @Penalty, Scramble = @Scramble, MoveCount = @MoveCount, CubeState = @CubeState,
                OStepTime = @OStepTime, PStepTime = @PStepTime, CrossTime = @CrossTime, F2LPairCount = @F2LPairCount, PLLCase = @PLLCase, PLLRecognitionTime = @PLLRecognitionTime, OStepEfficiency = @OStepEfficiency, PStepEfficiency = @PStepEfficiency WHERE Id = @Id",
                new[] {
                    new SqliteParameter("@EndTime", solve.EndTime ?? (object)DBNull.Value),
                    new SqliteParameter("@Time", solve.Time ?? (object)DBNull.Value),
                    new SqliteParameter("@FinalTime", solve.FinalTime ?? (object)DBNull.Value),
                    new SqliteParameter("@Penalty", solve.Penalty.HasValue ? (object)solve.Penalty.Value : DBNull.Value),
                    new SqliteParameter("@Scramble", solve.Scramble ?? (object)DBNull.Value),
                    new SqliteParameter("@MoveCount", solve.MoveCount),
                    new SqliteParameter("@CubeState", solve.CubeState ?? (object)DBNull.Value),
                    new SqliteParameter("@OStepTime", solve.OStepTime ?? (object)DBNull.Value),
                    new SqliteParameter("@PStepTime", solve.PStepTime ?? (object)DBNull.Value),
                    new SqliteParameter("@CrossTime", solve.CrossTime ?? (object)DBNull.Value),
                    new SqliteParameter("@F2LPairCount", solve.F2LPairCount),
                    new SqliteParameter("@PLLCase", solve.PLLCase ?? (object)DBNull.Value),
                    new SqliteParameter("@PLLRecognitionTime", solve.PLLRecognitionTime ?? (object)DBNull.Value),
                    new SqliteParameter("@OStepEfficiency", solve.OStepEfficiency ?? (object)DBNull.Value),
                    new SqliteParameter("@PStepEfficiency", solve.PStepEfficiency ?? (object)DBNull.Value),
                    new SqliteParameter("@Id", id)
                });
            if (rows == 0) return Results.NotFound();
            return Results.NoContent();
        });

        app.MapDelete("/api/solves/{id}", async (int id, SqliteConnection conn) =>
        {
            var rows = await conn.ExecuteAsync("DELETE FROM Solves WHERE Id = @Id", new[] { new SqliteParameter("@Id", id) });
            if (rows == 0) return Results.NotFound();
            return Results.NoContent();
        });

        app.MapGet("/api/solves/statistics", async (int? userId, SqliteConnection conn) =>
        {
            List<long?> times;
            if (userId.HasValue)
            {
                times = await conn.QueryAsync("SELECT s.FinalTime FROM Solves s JOIN Sessions ss ON s.SessionId = ss.Id WHERE ss.UserId = @UserId AND s.FinalTime IS NOT NULL ORDER BY s.StartTime DESC",
                    r => r.IsDBNull(0) ? (long?)null : r.GetInt64(0),
                    new[] { new SqliteParameter("@UserId", userId.Value) });
            }
            else
            {
                times = await conn.QueryAsync("SELECT FinalTime FROM Solves WHERE FinalTime IS NOT NULL ORDER BY StartTime DESC",
                    r => r.IsDBNull(0) ? (long?)null : r.GetInt64(0));
            }

            if (!times.Any())
                return Results.Ok(new StatisticsResponse(0, null, null, null, null, null));

            var validTimes = times.Where(t => t.HasValue).Select(t => t!.Value).ToList();
            var bestTime = validTimes.Min();
            var averageTime = (decimal)validTimes.Average();

            decimal? ao5 = null, ao12 = null, ao100 = null;
            if (validTimes.Count >= 5) { var t5 = validTimes.Take(5).OrderBy(t => t).Skip(1).Take(3).ToList(); if (t5.Any()) ao5 = (decimal)t5.Average(); }
            if (validTimes.Count >= 12) { var t12 = validTimes.Take(12).OrderBy(t => t).Skip(1).Take(10).ToList(); if (t12.Any()) ao12 = (decimal)t12.Average(); }
            if (validTimes.Count >= 100) { var t100 = validTimes.Take(100).OrderBy(t => t).Skip(1).Take(98).ToList(); if (t100.Any()) ao100 = (decimal)t100.Average(); }

            return Results.Ok(new StatisticsResponse(validTimes.Count, bestTime, averageTime, ao5, ao12, ao100));
        });
    }
}
