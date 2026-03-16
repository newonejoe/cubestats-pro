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

            // CFOP breakdown: Cross (~12%), F2L (~45%), OLL (~18%), PLL (~25%)
            var crossTime = (long)(time * 0.12);
            var f2lTime = (long)(time * 0.45);
            var ollTime = (long)(time * 0.18);
            var pllTime = (long)(time * 0.25);

            // Efficiency ratings based on time
            string crossEfficiency = time < 15000 ? "good" : time < 30000 ? "average" : "slow";
            string f2lEfficiency = time < 25000 ? "good" : time < 50000 ? "average" : "slow";
            string ollEfficiency = time < 5000 ? "good" : time < 10000 ? "average" : "slow";
            string pllEfficiency = time < 5000 ? "good" : time < 10000 ? "average" : "slow";

            // OLL cases with scramble algorithms
            var ollData = new Dictionary<string, (string name, string algorithm)>
            {
                { "Sune", ("Sune", "R U R' U R U2 R'") },
                { "Antisune", ("Antisune", "R' U' R U' R' U2 R") },
                { "H", ("H", "R U R' U R U' R'") },
                { "Pi", ("Pi", "R U2 R2 U' R2 U' R2 U2 R") },
                { "T", ("T", "R U R' U' R' F R2 U' R' U' R") },
                { "L", ("L", "L' U' L U' R' U2 R U R' U2 R") },
                { "U", ("U", "R U' R U R U R U' R' U' R2") },
                { "AS", ("AS", "R' U' R U' R' U R' F R2 U' R'") },
                { "E", ("E", "R U R' U R U' R' U' R' F R F'") },
                { "F", ("F", "R U R' U R U2 R' U' R U' R'") },
                { "G", ("G", "R2 U R' U R U2 R' U M'") },
                { "Na", ("Na", "R U R' U R U2 R' F' R U R' U' R' F R2") },
                { "N", ("N", "R' U R U' R' F' R U R' U' R' F R2 U' R'") },
                { "Ra", ("Ra", "R U' R U' R U R' U R2 F' R U R U' R'") },
                { "Rb", ("Rb", "R' U R' U' R' U R' U R2 F' R U R' U' R") }
            };
            var ollKeys = ollData.Keys.ToArray();
            var ollKey = ollKeys[new Random().Next(ollKeys.Length)];
            var ollCase = ollData[ollKey];

            // PLL cases with scramble algorithms (21 cases)
            var pllData = new Dictionary<string, (string name, string algorithm)>
            {
                { "Ua", ("Ua", "R U' R U R U R U' R' U' R2") },
                { "Ub", ("Ub", "R' U R' U' R' U' R' U R U R2") },
                { "H", ("H", "M2 U M2 U2 M2 U M2") },
                { "Z", ("Z", "M2 U M2 U M' U2 M2 U2 M'") },
                { "Aa", ("Aa", "R' F R2 U' R' U R U R' U' R2 F' R") },
                { "Ab", ("Ab", "R U' R2 U R U' R' U' R U R2") },
                { "E", ("E", "R U R' U R' F R2 U' R' U' R U R' F'") },
                { "T", ("T", "R U R' U' R' F R2 U' R' U' R U R' U' R") },
                { "Jb", ("Jb", "R' U R' U' R2 U' R U R U' R") },
                { "Ja", ("Ja", "R U R' F' R U R' U' R' F R2 U' R'") },
                { "F", ("F", "R U R' U R U2 R' U' R U' R2 F' R U R' U' R'") },
                { "V", ("V", "R' U R' U' R B' R' U' R U R B R2 U'") },
                { "Y", ("Y", "R U R' U' R' F R2 U' R' U' R U R' F'") },
                { "Na", ("Na", "R U' R U R U R U' R' U' R2 F' R U R' U' R'") },
                { "Nb", ("Nb", "R' U' R' U' R' U R' U R U R2 B' R' U' R U R B R") },
                { "Ra", ("Ra", "R U R' U' R U R' U' R' F R2 U' R' U R U' R' F'") },
                { "Rb", ("Rb", "R' U' R U R' U' R U' R2 B' R' U R U' R B R'") },
                { "Ga", ("Ga", "R2 U R' U R' U' R U' R2 F' R U R' U' R'") },
                { "Gb", ("Gb", "R' U' R U R' U R R2 U' R U R' U' R") },
                { "Gc", ("Gc", "R2 U' R U' R U R' U R2 F R U R' U' R'") },
                { "Gd", ("Gd", "R U R' U' R' U R R2 U' R' U' R U R") }
            };
            var pllKeys = pllData.Keys.ToArray();
            var pllKey = pllKeys[new Random().Next(pllKeys.Length)];
            var pllCase = pllData[pllKey];

            var pllRecognitionTime = (long)(pllTime * 0.3);
            var ollRecognitionTime = (long)(ollTime * 0.25);

            return Results.Ok(new
            {
                cross = new { time = crossTime, efficiency = crossEfficiency },
                f2l = new { time = f2lTime, efficiency = f2lEfficiency },
                oll = new { time = ollTime, caseName = ollCase.name, algorithm = ollCase.algorithm, recognitionTime = ollRecognitionTime, efficiency = ollEfficiency },
                pll = new { time = pllTime, caseName = pllCase.name, algorithm = pllCase.algorithm, recognitionTime = pllRecognitionTime, efficiency = pllEfficiency }
            });
        });
    }
}
