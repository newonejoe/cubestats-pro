using Microsoft.Data.Sqlite;

namespace CubeStatsApi.Data;

public static class DatabaseExtensions
{
    public static async Task<List<T>> QueryAsync<T>(this SqliteConnection conn, string sql, Func<SqliteDataReader, T> mapper, SqliteParameter[]? parms = null)
    {
        var results = new List<T>();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (parms != null) cmd.Parameters.AddRange(parms);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            results.Add(mapper(reader));
        return results;
    }

    public static async Task<T?> QuerySingleAsync<T>(this SqliteConnection conn, string sql, Func<SqliteDataReader, T> mapper, SqliteParameter[]? parms = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (parms != null) cmd.Parameters.AddRange(parms);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
            return mapper(reader);
        return default;
    }

    public static async Task<int> ExecuteAsync(this SqliteConnection conn, string sql, SqliteParameter[]? parms = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (parms != null) cmd.Parameters.AddRange(parms);
        return await cmd.ExecuteNonQueryAsync();
    }

    public static async Task<int> ExecuteWithLastIdAsync(this SqliteConnection conn, string sql, SqliteParameter[]? parms = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (parms != null) cmd.Parameters.AddRange(parms);
        await cmd.ExecuteNonQueryAsync();
        cmd.CommandText = "SELECT last_insert_rowid()";
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public static void InitializeDatabase(SqliteConnection conn)
    {
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Users (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT NOT NULL UNIQUE,
                Email TEXT,
                Role INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL,
                LastLoginAt TEXT
            );
            CREATE TABLE IF NOT EXISTS Sessions (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId INTEGER NOT NULL,
                Name TEXT,
                StartTime TEXT NOT NULL,
                EndTime TEXT,
                SolveCount INTEGER NOT NULL DEFAULT 0,
                AverageTime REAL,
                BestTime REAL,
                FOREIGN KEY (UserId) REFERENCES Users(Id)
            );
            CREATE TABLE IF NOT EXISTS Solves (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                SessionId INTEGER NOT NULL,
                StartTime TEXT NOT NULL,
                EndTime TEXT,
                Time INTEGER,
                FinalTime INTEGER,
                Penalty INTEGER,
                Scramble TEXT,
                MoveCount INTEGER NOT NULL DEFAULT 0,
                CubeState TEXT,
                OStepTime INTEGER,
                PStepTime INTEGER,
                CrossTime INTEGER,
                F2LPairCount INTEGER NOT NULL DEFAULT 0,
                PLLCase TEXT,
                PLLRecognitionTime INTEGER,
                OStepEfficiency TEXT,
                PStepEfficiency TEXT,
                FOREIGN KEY (SessionId) REFERENCES Sessions(Id)
            );
        ";
        cmd.ExecuteNonQuery();
    }
}
