using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CubeStatsApi.Data;
using CubeStatsApi.Models;

namespace CubeStatsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly CubeDbContext _context;

        public UsersController(CubeDbContext context)
        {
            _context = context;
        }

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            return await _context.Users
                .Select(u => new { u.Id, u.Username, u.Email, u.Role, u.CreatedAt, u.LastLoginAt })
                .ToListAsync();
        }

        // GET: api/users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return new { user.Id, user.Username, user.Email, user.Role, user.CreatedAt, user.LastLoginAt };
        }

        // POST: api/users
        [HttpPost]
        public async Task<ActionResult<User>> CreateUser(User user)
        {
            if (_context.Users.Any(u => u.Username == user.Username))
            {
                return BadRequest("Username already exists");
            }

            user.CreatedAt = DateTime.UtcNow;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        // PUT: api/users/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, User user)
        {
            if (id != user.Id)
            {
                return BadRequest();
            }

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // GET: api/users/5/sessions
        [HttpGet("{id}/sessions")]
        public async Task<ActionResult<IEnumerable<Session>>> GetUserSessions(int id)
        {
            return await _context.Sessions
                .Where(s => s.UserId == id)
                .Include(s => s.Solves)
                .OrderByDescending(s => s.StartTime)
                .ToListAsync();
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(u => u.Id == id);
        }
    }
}
