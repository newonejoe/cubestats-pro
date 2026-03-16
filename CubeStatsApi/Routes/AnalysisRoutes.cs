using Microsoft.Data.Sqlite;
using CubeStatsApi;
using CubeStatsApi.Data;

namespace CubeStatsApi.Routes;

public static class AnalysisRoutes
{
    public static void MapAnalysisRoutes(this WebApplication app)
    {
        app.MapGet("/api/analysis/cfop/{solveId}", async (int solveId, SqliteConnection conn) =>
        {
            var solve = await conn.QuerySingleAsync("SELECT Id, OStepTime, CrossTime, F2LPairCount, OStepEfficiency, PStepTime, PLLCase, PLLRecognitionTime, PStepEfficiency FROM Solves WHERE Id = @Id",
                r => new { Id = r.GetInt32(0), OStepTime = r.IsDBNull(1) ? (long?)null : r.GetInt64(1), CrossTime = r.IsDBNull(2) ? (long?)null : r.GetInt64(2), F2LPairCount = r.GetInt32(3), OStepEfficiency = r.IsDBNull(4) ? null : r.GetString(4), PStepTime = r.IsDBNull(5) ? (long?)null : r.GetInt64(5), PLLCase = r.IsDBNull(6) ? null : r.GetString(6), PLLRecognitionTime = r.IsDBNull(7) ? (long?)null : r.GetInt64(7), PStepEfficiency = r.IsDBNull(8) ? null : r.GetString(8) },
                new[] { new SqliteParameter("@Id", solveId) });
            if (solve == null) return Results.NotFound();

            return Results.Ok(new CfopResponse(solve.Id,
                new OStepInfo(solve.OStepTime, solve.CrossTime, solve.F2LPairCount, solve.OStepEfficiency),
                new PStepInfo(solve.PStepTime, solve.PLLCase, solve.PLLRecognitionTime, solve.PStepEfficiency)));
        });

        app.MapGet("/api/analysis/summary/{userId}", async (int userId, SqliteConnection conn) =>
        {
            var solves = await conn.QueryAsync("SELECT s.OStepTime, s.CrossTime, s.F2LPairCount, s.OStepEfficiency, s.PStepTime, s.PLLCase, s.PLLRecognitionTime, s.PStepEfficiency FROM Solves s JOIN Sessions ss ON s.SessionId = ss.Id WHERE ss.UserId = @UserId AND s.FinalTime IS NOT NULL",
                r => new { OStepTime = r.IsDBNull(0) ? (long?)null : r.GetInt64(0), CrossTime = r.IsDBNull(1) ? (long?)null : r.GetInt64(1), F2LPairCount = r.GetInt32(2), OStepEfficiency = r.IsDBNull(3) ? null : r.GetString(3), PStepTime = r.IsDBNull(4) ? (long?)null : r.GetInt64(4), PLLCase = r.IsDBNull(5) ? null : r.GetString(5), PLLRecognitionTime = r.IsDBNull(6) ? (long?)null : r.GetInt64(6), PStepEfficiency = r.IsDBNull(7) ? null : r.GetString(7) },
                new[] { new SqliteParameter("@UserId", userId) });

            if (!solves.Any())
                return Results.Ok(new AnalysisSummaryResponse(0, new OStepAnalysis(null, new Dictionary<string, int>(), null, 0), new PStepAnalysis(null, new Dictionary<string, int>(), null)));

            var oStepSolves = solves.Where(s => s.OStepTime != null).ToList();
            long? avgOStepTime = oStepSolves.Any() ? (long)oStepSolves.Average(s => s.OStepTime!.Value) : null;
            var oStepEfficiency = oStepSolves.GroupBy(s => s.OStepEfficiency ?? "unknown").ToDictionary(g => g.Key, g => g.Count());

            var pStepSolves = solves.Where(s => s.PStepTime != null).ToList();
            long? avgPStepTime = pStepSolves.Any() ? (long)pStepSolves.Average(s => s.PStepTime!.Value) : null;
            var pllDistribution = pStepSolves.Where(s => !string.IsNullOrEmpty(s.PLLCase)).GroupBy(s => s.PLLCase).ToDictionary(g => g.Key!, g => g.Count());

            return Results.Ok(new AnalysisSummaryResponse(solves.Count,
                new OStepAnalysis(avgOStepTime, oStepEfficiency, oStepSolves.Any() ? (long?)oStepSolves.Average(s => s.CrossTime ?? 0) : null, oStepSolves.Any() ? oStepSolves.Average(s => s.F2LPairCount) : 0),
                new PStepAnalysis(avgPStepTime, pllDistribution, pStepSolves.Any() ? (long?)pStepSolves.Average(s => s.PLLRecognitionTime ?? 0) : null)));
        });

        app.MapPost("/api/analysis/analyze", async (AnalyzeRequest request, SqliteConnection conn) =>
        {
            if (request.Time == null || request.Time <= 0)
                return Results.BadRequest("Valid solve time is required");

            var time = request.Time.Value;
            var oStepTime = (long)(time * 0.25);
            var pStepTime = (long)(time * 0.20);

            string oStepEfficiency, pStepEfficiency;
            if (time < 30000) { oStepEfficiency = "good"; pStepEfficiency = "good"; }
            else if (time < 60000) { oStepEfficiency = "average"; pStepEfficiency = "average"; }
            else { oStepEfficiency = "slow"; pStepEfficiency = "slow"; }

            var crossTime = (long)(oStepTime * 0.4);
            var pllCases = new[] { "Ua", "Ub", "H", "Z", "Aa", "Ab", "E", "T", "Jb", "Ja", "F", "V", "Y", "Na", "Nb" };
            var pllCase = pllCases[new Random().Next(pllCases.Length)];
            var recognitionTime = (long)(pStepTime * 0.3);

            return Results.Ok(new
            {
                oStep = new { time = oStepTime, crossTime = crossTime, f2lPairs = 4, efficiency = oStepEfficiency },
                pStep = new { time = pStepTime, pllCase = pllCase, recognitionTime = recognitionTime, efficiency = pStepEfficiency }
            });
        });
    }
}
