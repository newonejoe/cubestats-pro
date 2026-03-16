using Microsoft.EntityFrameworkCore;
using CubeStatsApi.Models;

namespace CubeStatsApi.Data
{
    public class CubeDbContext : DbContext
    {
        public CubeDbContext(DbContextOptions<CubeDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Session> Sessions { get; set; }
        public DbSet<Solve> Solves { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasMany(u => u.Sessions)
                    .WithOne(s => s.User)
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Session configuration
            modelBuilder.Entity<Session>(entity =>
            {
                entity.HasMany(s => s.Solves)
                    .WithOne(sol => sol.Session)
                    .HasForeignKey(sol => sol.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Seed default coach user
            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Username = "coach", Role = UserRole.Coach, CreatedAt = DateTime.UtcNow },
                new User { Id = 2, Username = "user1", Role = UserRole.User, CreatedAt = DateTime.UtcNow }
            );
        }
    }
}
