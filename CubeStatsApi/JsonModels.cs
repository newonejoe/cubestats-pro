using System.Text.Json.Serialization;

namespace CubeStatsApi;

[JsonSerializable(typeof(User))]
[JsonSerializable(typeof(Session))]
[JsonSerializable(typeof(Solve))]
[JsonSerializable(typeof(AnalyzeRequest))]
[JsonSerializable(typeof(Dictionary<string, int>))]
[JsonSerializable(typeof(List<User>))]
[JsonSerializable(typeof(List<UserResponse>))]
[JsonSerializable(typeof(UserResponse))]
[JsonSerializable(typeof(UserSummary))]
[JsonSerializable(typeof(List<Session>))]
[JsonSerializable(typeof(List<SessionResponse>))]
[JsonSerializable(typeof(SessionResponse))]
[JsonSerializable(typeof(List<SessionResponse2>))]
[JsonSerializable(typeof(SessionResponse2))]
[JsonSerializable(typeof(SessionDetailResponse))]
[JsonSerializable(typeof(List<Solve>))]
[JsonSerializable(typeof(List<SolveResponse>))]
[JsonSerializable(typeof(SolveResponse))]
[JsonSerializable(typeof(StatisticsResponse))]
[JsonSerializable(typeof(CfopResponse))]
[JsonSerializable(typeof(AnalysisSummaryResponse))]
[JsonSerializable(typeof(OStepInfo))]
[JsonSerializable(typeof(PStepInfo))]
[JsonSerializable(typeof(OStepAnalysis))]
[JsonSerializable(typeof(PStepAnalysis))]
[JsonSerializable(typeof(object))]
public partial class JsonContext : JsonSerializerContext { }

// Request/Response records
public record User(int Id, string Username, string? Email, int Role, string? CreatedAt, string? LastLoginAt);
public record UserResponse(int Id, string Username, string? Email, int Role, string CreatedAt, string? LastLoginAt);
public record UserSummary(int Id, string Username);

public record Session(int Id, int UserId, string? Name, string? StartTime, string? EndTime, int SolveCount, decimal? AverageTime, decimal? BestTime);
public record SessionResponse(int Id, int UserId, string? Name, string StartTime, string? EndTime, int SolveCount, decimal? AverageTime, decimal? BestTime, object? User, List<Solve>? Solves);
public record SessionResponse2(int Id, int UserId, string? Name, string StartTime, string? EndTime, int SolveCount, decimal? AverageTime, decimal? BestTime, UserSummary User);
public record SessionDetailResponse(int Id, int UserId, string? Name, string StartTime, string? EndTime, int SolveCount, decimal? AverageTime, decimal? BestTime, UserSummary User, List<Solve> Solves);

public record Solve(int Id, int SessionId, string? StartTime, string? EndTime, long? Time, long? FinalTime, int? Penalty, string? Scramble, int MoveCount);
public record SolveResponse(int Id, int SessionId, string StartTime, string? EndTime, long? Time, long? FinalTime, int? Penalty, string? Scramble, int MoveCount, string? CubeState, long? OStepTime, long? PStepTime, long? CrossTime, int F2LPairCount, string? PLLCase, long? PLLRecognitionTime, string? OStepEfficiency, string? PStepEfficiency);

public record AnalyzeRequest(long? Time, string? CubeState);

public record StatisticsResponse(int totalSolves, long? bestTime, decimal? averageTime, decimal? ao5, decimal? ao12, decimal? ao100);

public record CfopResponse(int solveId, OStepInfo oStep, PStepInfo pStep);

public record AnalysisSummaryResponse(int totalSolves, OStepAnalysis oStepAnalysis, PStepAnalysis pStepAnalysis);

public record OStepInfo(long? totalTime, long? crossTime, int f2lPairs, string? efficiency);
public record PStepInfo(long? totalTime, string? pllCase, long? recognitionTime, string? efficiency);
public record OStepAnalysis(long? averageTime, Dictionary<string, int> efficiencyBreakdown, long? averageCrossTime, double averageF2LPairs);
public record PStepAnalysis(long? averageTime, Dictionary<string, int> pllCaseDistribution, long? averageRecognitionTime);
