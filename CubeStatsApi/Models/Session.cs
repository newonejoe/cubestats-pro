using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CubeStatsApi.Models
{
    public class Session
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [MaxLength(200)]
        public string? Name { get; set; }

        public DateTime StartTime { get; set; } = DateTime.UtcNow;

        public DateTime? EndTime { get; set; }

        public int SolveCount { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? AverageTime { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? BestTime { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        public virtual ICollection<Solve> Solves { get; set; } = new List<Solve>();
    }
}
