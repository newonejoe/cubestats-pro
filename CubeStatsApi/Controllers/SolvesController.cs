using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CubeStatsApi.Data;
using CubeStatsApi.Models;

namespace CubeStatsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SolvesController : ControllerBase
    {
        private readonly CubeDbContext _context;

        public SolvesController(CubeDbContext context)
        {
            _context = context;
        }

        // GET: api/solves
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Solve>>> GetSolves([FromQuery] int? sessionId, [FromQuery] int? userId)
        {
            var query = _context.Solves.AsQueryable();

            if (sessionId.HasValue)
            {
                query = query.Where(s => s.SessionId == sessionId.Value);
            }

            if (userId.HasValue)
            {
                query = query.Include(s => s.Session)
                    .Where(s => s.Session != null && s.Session.UserId == userId.Value);
            }

            return await query.OrderByDescending(s => s.StartTime).ToListAsync();
        }

        // GET: api/solves/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Solve>> GetSolve(int id)
        {
            var solve = await _context.Solves
                .Include(s => s.Session)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (solve == null)
            {
                return NotFound();
            }

            return solve;
        }

        // POST: api/solves
        [HttpPost]
        public async Task<ActionResult<Solve>> CreateSolve(Solve solve)
        {
            solve.StartTime = DateTime.UtcNow;
            _context.Solves.Add(solve);
            await _context.SaveChangesAsync();

            // Update session statistics
            var session = await _context.Sessions
                .Include(s => s.Solves)
                .FirstOrDefaultAsync(s => s.Id == solve.SessionId);

            if (session != null)
            {
                var validSolves = session.Solves.Where(s => s.FinalTime != null).ToList();
                session.SolveCount = validSolves.Count;
                if (validSolves.Any())
                {
                    session.BestTime = validSolves.Min(s => s.FinalTime);
                    session.AverageTime = (decimal?)validSolves.Average(s => s.FinalTime);
                }
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetSolve), new { id = solve.Id }, solve);
        }

        // PUT: api/solves/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSolve(int id, Solve solve)
        {
            if (id != solve.Id)
            {
                return BadRequest();
            }

            var existingSolve = await _context.Solves.FindAsync(id);
            if (existingSolve == null)
            {
                return NotFound();
            }

            existingSolve.EndTime = solve.EndTime;
            existingSolve.Time = solve.Time;
            existingSolve.FinalTime = solve.FinalTime;
            existingSolve.Penalty = solve.Penalty;
            existingSolve.Scramble = solve.Scramble;
            existingSolve.MoveCount = solve.MoveCount;
            existingSolve.CubeState = solve.CubeState;

            // CFOP Analysis
            existingSolve.OStepTime = solve.OStepTime;
            existingSolve.PStepTime = solve.PStepTime;
            existingSolve.CrossTime = solve.CrossTime;
            existingSolve.F2LPairCount = solve.F2LPairCount;
            existingSolve.PLLCase = solve.PLLCase;
            existingSolve.PLLRecognitionTime = solve.PLLRecognitionTime;
            existingSolve.OStepEfficiency = solve.OStepEfficiency;
            existingSolve.PStepEfficiency = solve.PStepEfficiency;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/solves/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSolve(int id)
        {
            var solve = await _context.Solves.FindAsync(id);
            if (solve == null)
            {
                return NotFound();
            }

            _context.Solves.Remove(solve);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/solves/statistics
        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetStatistics([FromQuery] int? userId)
        {
            IQueryable<Solve> query = _context.Solves.Include(s => s.Session);

            if (userId.HasValue)
            {
                query = query.Where(s => s.Session != null && s.Session.UserId == userId.Value);
            }

            var solves = await query.ToListAsync();
            var validSolves = solves.Where(s => s.FinalTime != null).ToList();

            if (!validSolves.Any())
            {
                return Ok(new
                {
                    totalSolves = 0,
                    bestTime = (long?)null,
                    averageTime = (decimal?)null,
                    ao5 = (decimal?)null,
                    ao12 = (decimal?)null,
                    ao100 = (decimal?)null
                });
            }

            var bestTime = validSolves.Min(s => s.FinalTime!.Value);
            var averageTime = validSolves.Average(s => s.FinalTime!.Value);

            // Calculate Ao5
            decimal? ao5 = null;
            if (validSolves.Count >= 5)
            {
                var recent5 = validSolves.OrderByDescending(s => s.StartTime).Take(5).ToList();
                if (recent5.Count == 5)
                {
                    var trimmed = recent5.OrderBy(s => s.FinalTime).Skip(1).Take(3).ToList();
                    if (trimmed.Any())
                    {
                        ao5 = (decimal)trimmed.Average(s => s.FinalTime!.Value);
                    }
                }
            }

            // Calculate Ao12
            decimal? ao12 = null;
            if (validSolves.Count >= 12)
            {
                var recent12 = validSolves.OrderByDescending(s => s.StartTime).Take(12).ToList();
                if (recent12.Count == 12)
                {
                    var trimmed = recent12.OrderBy(s => s.FinalTime).Skip(1).Take(10).ToList();
                    if (trimmed.Any())
                    {
                        ao12 = (decimal)trimmed.Average(s => s.FinalTime!.Value);
                    }
                }
            }

            // Calculate Ao100
            decimal? ao100 = null;
            if (validSolves.Count >= 100)
            {
                var recent100 = validSolves.OrderByDescending(s => s.StartTime).Take(100).ToList();
                if (recent100.Count == 100)
                {
                    var trimmed = recent100.OrderBy(s => s.FinalTime).Skip(1).Take(98).ToList();
                    if (trimmed.Any())
                    {
                        ao100 = (decimal)trimmed.Average(s => s.FinalTime!.Value);
                    }
                }
            }

            return Ok(new
            {
                totalSolves = validSolves.Count,
                bestTime,
                averageTime,
                ao5,
                ao12,
                ao100
            });
        }
    }
}
