using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CubeStatsApi.Models
{
    public class Solve
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SessionId { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        /// <summary>
        /// Raw solve time in milliseconds
        /// </summary>
        public long? Time { get; set; }

        /// <summary>
        /// Final time after penalties in milliseconds
        /// </summary>
        public long? FinalTime { get; set; }

        public PenaltyType? Penalty { get; set; }

        [MaxLength(500)]
        public string Scramble { get; set; } = string.Empty;

        public int MoveCount { get; set; }

        public string? CubeState { get; set; }

        // CFOP Analysis Fields
        public long? OStepTime { get; set; }  // Orientation step time
        public long? PStepTime { get; set; }  // Permutation step time
        public long? CrossTime { get; set; }
        public int F2LPairCount { get; set; }

        [MaxLength(50)]
        public string? PLLCase { get; set; }

        public long? PLLRecognitionTime { get; set; }

        public string? OStepEfficiency { get; set; }  // good, average, slow
        public string? PStepEfficiency { get; set; }

        [ForeignKey("SessionId")]
        public virtual Session? Session { get; set; }
    }

    public enum PenaltyType
    {
        None = 0,
        Plus2 = 1,
        DNF = 2
    }
}
