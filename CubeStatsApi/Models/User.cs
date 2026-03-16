using System.ComponentModel.DataAnnotations;

namespace CubeStatsApi.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Email { get; set; }

        [Required]
        public UserRole Role { get; set; } = UserRole.User;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastLoginAt { get; set; }

        public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();
    }

    public enum UserRole
    {
        User = 0,
        Coach = 1,
        Admin = 2
    }
}
