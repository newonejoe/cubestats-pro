using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CubeStatsApi.Data;
using CubeStatsApi.Models;

namespace CubeStatsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SessionsController : ControllerBase
    {
        private readonly CubeDbContext _context;

        public SessionsController(CubeDbContext context)
        {
            _context = context;
        }

        // GET: api/sessions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Session>>> GetSessions([FromQuery] int? userId)
        {
            var query = _context.Sessions.Include(s => s.User).AsQueryable();

            if (userId.HasValue)
            {
                query = query.Where(s => s.UserId == userId.Value);
            }

            return await query.OrderByDescending(s => s.StartTime).ToListAsync();
        }

        // GET: api/sessions/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Session>> GetSession(int id)
        {
            var session = await _context.Sessions
                .Include(s => s.User)
                .Include(s => s.Solves)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (session == null)
            {
                return NotFound();
            }

            return session;
        }

        // POST: api/sessions
        [HttpPost]
        public async Task<ActionResult<Session>> CreateSession(Session session)
        {
            session.StartTime = DateTime.UtcNow;
            _context.Sessions.Add(session);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSession), new { id = session.Id }, session);
        }

        // PUT: api/sessions/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSession(int id, Session session)
        {
            if (id != session.Id)
            {
                return BadRequest();
            }

            var existingSession = await _context.Sessions
                .Include(s => s.Solves)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (existingSession == null)
            {
                return NotFound();
            }

            // Calculate statistics
            var validSolves = existingSession.Solves.Where(s => s.FinalTime != null).ToList();
            if (validSolves.Any())
            {
                existingSession.SolveCount = validSolves.Count;
                existingSession.BestTime = validSolves.Min(s => s.FinalTime);
                existingSession.AverageTime = (decimal?)validSolves.Average(s => s.FinalTime);
            }

            if (session.EndTime.HasValue)
            {
                existingSession.EndTime = session.EndTime;
            }

            if (!string.IsNullOrEmpty(session.Name))
            {
                existingSession.Name = session.Name;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/sessions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSession(int id)
        {
            var session = await _context.Sessions.FindAsync(id);
            if (session == null)
            {
                return NotFound();
            }

            _context.Sessions.Remove(session);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/sessions/5/solves
        [HttpGet("{id}/solves")]
        public async Task<ActionResult<IEnumerable<Solve>>> GetSessionSolves(int id)
        {
            return await _context.Solves
                .Where(s => s.SessionId == id)
                .OrderBy(s => s.StartTime)
                .ToListAsync();
        }
    }
}
