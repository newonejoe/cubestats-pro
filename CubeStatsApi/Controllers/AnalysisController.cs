using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CubeStatsApi.Data;
using CubeStatsApi.Models;

namespace CubeStatsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalysisController : ControllerBase
    {
        private readonly CubeDbContext _context;

        public AnalysisController(CubeDbContext context)
        {
            _context = context;
        }

        // GET: api/analysis/cfop/5
        [HttpGet("cfop/{solveId}")]
        public async Task<ActionResult<object>> GetCFOPAnalysis(int solveId)
        {
            var solve = await _context.Solves.FindAsync(solveId);
            if (solve == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                solveId = solve.Id,
                oStep = new
                {
                    totalTime = solve.OStepTime,
                    crossTime = solve.CrossTime,
                    f2lPairs = solve.F2LPairCount,
                    efficiency = solve.OStepEfficiency
                },
                pStep = new
                {
                    totalTime = solve.PStepTime,
                    pllCase = solve.PLLCase,
                    recognitionTime = solve.PLLRecognitionTime,
                    efficiency = solve.PStepEfficiency
                }
            });
        }

        // GET: api/analysis/summary/5 (userId)
        [HttpGet("summary/{userId}")]
        public async Task<ActionResult<object>> GetUserAnalysisSummary(int userId)
        {
            var solves = await _context.Solves
                .Include(s => s.Session)
                .Where(s => s.Session != null && s.Session.UserId == userId && s.FinalTime != null)
                .ToListAsync();

            if (!solves.Any())
            {
                return Ok(new
                {
                    totalSolves = 0,
                    oStepAnalysis = new { averageTime = (long?)null, efficiencyBreakdown = new { } },
                    pStepAnalysis = new { averageTime = (long?)null, pllCaseDistribution = new { } }
                });
            }

            // O-Step Analysis
            var oStepSolves = solves.Where(s => s.OStepTime != null).ToList();
            long? avgOStepTime = oStepSolves.Any() ? (long)oStepSolves.Average(s => s.OStepTime!.Value) : null;

            var oStepEfficiency = oStepSolves
                .GroupBy(s => s.OStepEfficiency ?? "unknown")
                .ToDictionary(g => g.Key, g => g.Count());

            // P-Step Analysis
            var pStepSolves = solves.Where(s => s.PStepTime != null).ToList();
            long? avgPStepTime = pStepSolves.Any() ? (long)pStepSolves.Average(s => s.PStepTime!.Value) : null;

            var pllDistribution = pStepSolves
                .Where(s => !string.IsNullOrEmpty(s.PLLCase))
                .GroupBy(s => s.PLLCase)
                .ToDictionary(g => g.Key!, g => g.Count());

            return Ok(new
            {
                totalSolves = solves.Count,
                oStepAnalysis = new
                {
                    averageTime = avgOStepTime,
                    efficiencyBreakdown = oStepEfficiency,
                    averageCrossTime = oStepSolves.Any() ? (long?)oStepSolves.Average(s => s.CrossTime ?? 0) : null,
                    averageF2LPairs = oStepSolves.Any() ? oStepSolves.Average(s => s.F2LPairCount) : 0
                },
                pStepAnalysis = new
                {
                    averageTime = avgPStepTime,
                    pllCaseDistribution = pllDistribution,
                    averageRecognitionTime = pStepSolves.Any() ? (long?)pStepSolves.Average(s => s.PLLRecognitionTime ?? 0) : null
                }
            });
        }

        // POST: api/analysis/analyze
        [HttpPost("analyze")]
        public async Task<ActionResult<object>> AnalyzeSolve([FromBody] AnalyzeRequest request)
        {
            // This endpoint performs CFOP analysis on solve data
            // In a real implementation, this would analyze cube state data

            if (request.Time == null || request.Time <= 0)
            {
                return BadRequest("Valid solve time is required");
            }

            var time = request.Time.Value;

            // Simulated CFOP breakdown (in production, use actual cube state data)
            var oStepTime = (long)(time * 0.25); // 25% for O-step
            var pStepTime = (long)(time * 0.20); // 20% for P-step

            // Determine efficiency based on time
            string oStepEfficiency, pStepEfficiency;

            if (time < 30000) // Under 30 seconds
            {
                oStepEfficiency = "good";
                pStepEfficiency = "good";
            }
            else if (time < 60000) // 30-60 seconds
            {
                oStepEfficiency = "average";
                pStepEfficiency = "average";
            }
            else // Over 60 seconds
            {
                oStepEfficiency = "slow";
                pStepEfficiency = "slow";
            }

            // Cross time is roughly 40% of O-step
            var crossTime = (long)(oStepTime * 0.4);

            // PLL case would be detected from cube state in real implementation
            var pllCases = new[] { "Ua", "Ub", "H", "Z", "Aa", "Ab", "E", "T", "Jb", "Ja", "F", "V", "Y", "Na", "Nb" };
            var pllCase = pllCases[new Random().Next(pllCases.Length)];

            // Recognition time is roughly 30% of P-step
            var recognitionTime = (long)(pStepTime * 0.3);

            return Ok(new
            {
                oStep = new
                {
                    time = oStepTime,
                    crossTime = crossTime,
                    f2lPairs = 4, // Simulated
                    efficiency = oStepEfficiency
                },
                pStep = new
                {
                    time = pStepTime,
                    pllCase = pllCase,
                    recognitionTime = recognitionTime,
                    efficiency = pStepEfficiency
                }
            });
        }
    }

    public class AnalyzeRequest
    {
        public long? Time { get; set; }
        public string? CubeState { get; set; }
    }
}
