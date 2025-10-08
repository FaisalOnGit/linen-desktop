using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Symbol.RFID3;

namespace ZebraLib
{
    public class RfidWrapper
    {
        private static RFIDReader _reader;
        private static bool _isConnected = false;
        private static Dictionary<string, SessionData> _sessions = new Dictionary<string, SessionData>();
        private static readonly object _sessionsLock = new object();

        // Session-specific data container
        private class SessionData
        {
            public List<TagRecord> Tags { get; set; } = new List<TagRecord>();
            public bool IsActive { get; set; } = false;
            public DateTime SessionStart { get; set; }
            public string SessionName { get; set; }
        }

        public class TagRecord
        {
            public string EPC { get; set; }
            public int AntennaID { get; set; }
            public DateTime Timestamp { get; set; }
        }

        public async Task<object> Connect(dynamic input)
        {
            try
            {
                string ip = (string)input.ip;
                uint port = (uint)input.port;

                _reader = new RFIDReader(ip, port, 0);
                _reader.Connect();
                _isConnected = true;

                _reader.Events.ReadNotify += Events_ReadNotify;
                _reader.Events.AttachTagDataWithReadEvent = true;

                return $"Connected to {ip}:{port}";
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        private void Events_ReadNotify(object sender, Events.ReadEventArgs args)
        {
            try
            {
                TagData[] tagData = _reader.Actions.GetReadTags(1000);
                if (tagData != null)
                {
                    foreach (TagData tag in tagData)
                    {
                        // Distribute tags to all active sessions
                        SessionData[] activeSessions;
                        lock (_sessionsLock)
                        {
                            activeSessions = _sessions.Values.Where(s => s.IsActive).ToArray();
                        }

                        foreach (var session in activeSessions)
                        {
                            lock (session.Tags)
                            {
                                var existing = session.Tags.Find(t => t.EPC == tag.TagID && t.AntennaID == tag.AntennaID);
                                if (existing == null)
                                {
                                    session.Tags.Add(new TagRecord
                                    {
                                        EPC = tag.TagID,
                                        AntennaID = tag.AntennaID,
                                        Timestamp = DateTime.Now
                                    });
                                }
                                else
                                {
                                    existing.Timestamp = DateTime.Now;
                                }
                            }
                        }

                        // Keep backward compatibility - also update legacy _tags
                        lock (_tags)
                        {
                            var existing = _tags.Find(t => t.EPC == tag.TagID && t.AntennaID == tag.AntennaID);
                            if (existing == null)
                            {
                                _tags.Add(new TagRecord
                                {
                                    EPC = tag.TagID,
                                    AntennaID = tag.AntennaID,
                                    Timestamp = DateTime.Now
                                });
                            }
                            else
                            {
                                existing.Timestamp = DateTime.Now;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("ReadNotify Error: " + ex.Message);
            }
        }

        public async Task<object> StartInventory(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return "Not connected";

            try
            {
                _reader.Actions.Inventory.Perform();
                return "Inventory started";
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        public async Task<object> StopInventory(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return "Not connected";

            try
            {
                _reader.Actions.Inventory.Stop();
                return "Inventory stopped";
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        public async Task<object> SetPower(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return new { success = false, message = "Not connected to reader" };

            try
            {
                // Validate input parameters
                if (input.antennaId == null || input.power == null)
                    return new { success = false, message = "antennaId and power parameters are required" };

                ushort antennaId = (ushort)input.antennaId;
                ushort power = (ushort)input.power;

                // Validate antenna ID range (1-4 for most readers)
                if (antennaId < 1 || antennaId > 4)
                    return new { success = false, message = "Invalid antenna ID. Must be between 1 and 4" };

                // Validate power range (typical Zebra readers: 0-300)
                if (power > 300)
                    return new { success = false, message = "Power level too high. Maximum is 300 (30.0 dBm)" };

                var rf = _reader.Config.Antennas[antennaId].GetRfConfig();
                rf.TransmitPowerIndex = power;
                _reader.Config.Antennas[antennaId].SetRfConfig(rf);

                return new {
                    success = true,
                    antennaId = antennaId,
                    power = power,
                    powerDbm = power / 10.0,
                    message = $"Power set to {power / 10.0:F1} dBm on antenna {antennaId}"
                };
            }
            catch (IndexOutOfRangeException)
            {
                return new { success = false, message = "Invalid antenna ID" };
            }
            catch (InvalidOperationException ex)
            {
                return new { success = false, message = $"Invalid power setting: {ex.Message}" };
            }
            catch (Exception ex)
            {
                return new { success = false, message = $"Error setting power: {ex.Message}" };
            }
        }

        public async Task<object> GetPower(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return "Not connected";

            try
            {
                ushort antennaId = (ushort)input.antennaId;

                var rf = _reader.Config.Antennas[antennaId].GetRfConfig();
                ushort power = rf.TransmitPowerIndex;

                return new { antennaId = antennaId, power = power, powerDbm = power / 10.0 };
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        // Session Management Methods
        public async Task<object> CreateSession(dynamic input)
        {
            try
            {
                string sessionId = Guid.NewGuid().ToString("N").Substring(0, 8);
                string sessionName = input.sessionName ?? "Unnamed Session";

                lock (_sessionsLock)
                {
                    _sessions[sessionId] = new SessionData
                    {
                        SessionStart = DateTime.Now,
                        SessionName = sessionName
                    };
                }

                return new {
                    success = true,
                    sessionId = sessionId,
                    sessionName = sessionName,
                    message = $"Session '{sessionName}' created successfully"
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = $"Error creating session: {ex.Message}" };
            }
        }

        public async Task<object> StartSessionInventory(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return new { success = false, message = "Not connected to reader" };

            try
            {
                string sessionId = (string)input.sessionId;

                lock (_sessionsLock)
                {
                    if (!_sessions.ContainsKey(sessionId))
                        return new { success = false, message = "Session not found" };

                    _sessions[sessionId].IsActive = true;
                }

                // Start global inventory if not already running
                try
                {
                    _reader.Actions.Inventory.Perform();
                }
                catch
                {
                    // Inventory might already be running, which is fine
                }

                return new {
                    success = true,
                    sessionId = sessionId,
                    message = $"Session {sessionId} inventory started"
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = $"Error starting session inventory: {ex.Message}" };
            }
        }

        public async Task<object> StopSessionInventory(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return new { success = false, message = "Not connected to reader" };

            try
            {
                string sessionId = (string)input.sessionId;

                lock (_sessionsLock)
                {
                    if (!_sessions.ContainsKey(sessionId))
                        return new { success = false, message = "Session not found" };

                    _sessions[sessionId].IsActive = false;
                }

                // Check if any other sessions are still active
                bool anyActiveSessions;
                lock (_sessionsLock)
                {
                    anyActiveSessions = _sessions.Values.Any(s => s.IsActive);
                }

                // Only stop global inventory if no sessions are active
                if (!anyActiveSessions)
                {
                    try
                    {
                        _reader.Actions.Inventory.Stop();
                    }
                    catch
                    {
                        // Inventory might already be stopped
                    }
                }

                return new {
                    success = true,
                    sessionId = sessionId,
                    message = $"Session {sessionId} inventory stopped"
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = $"Error stopping session inventory: {ex.Message}" };
            }
        }

        public async Task<object> GetSessionTags(dynamic input)
        {
            string sessionId = (string)input.sessionId;

            lock (_sessionsLock)
            {
                if (!_sessions.ContainsKey(sessionId))
                    return new TagRecord[0];

                lock (_sessions[sessionId].Tags)
                {
                    return _sessions[sessionId].Tags.ToArray();
                }
            }
        }

        public async Task<object> ClearSessionTags(dynamic input)
        {
            string sessionId = (string)input.sessionId;

            lock (_sessionsLock)
            {
                if (!_sessions.ContainsKey(sessionId))
                    return new { success = false, message = "Session not found" };

                lock (_sessions[sessionId].Tags)
                {
                    _sessions[sessionId].Tags.Clear();
                }
            }

            return new {
                success = true,
                sessionId = sessionId,
                message = $"Tags cleared for session {sessionId}"
            };
        }

        public async Task<object> DestroySession(dynamic input)
        {
            string sessionId = (string)input.sessionId;

            lock (_sessionsLock)
            {
                if (!_sessions.ContainsKey(sessionId))
                    return new { success = false, message = "Session not found" };

                // Stop the session first
                _sessions[sessionId].IsActive = false;
                _sessions.Remove(sessionId);
            }

            // Check if any other sessions are still active
            bool anyActiveSessions;
            lock (_sessionsLock)
            {
                anyActiveSessions = _sessions.Values.Any(s => s.IsActive);
            }

            // Only stop global inventory if no sessions are active
            if (!anyActiveSessions)
            {
                try
                {
                    _reader.Actions.Inventory.Stop();
                }
                catch
                {
                    // Inventory might already be stopped
                }
            }

            return new {
                success = true,
                sessionId = sessionId,
                message = $"Session {sessionId} destroyed"
            };
        }

        public async Task<object> GetActiveSessions(dynamic input)
        {
            lock (_sessionsLock)
            {
                var sessions = _sessions.Select(kvp => new {
                    sessionId = kvp.Key,
                    sessionName = kvp.Value.SessionName,
                    isActive = kvp.Value.IsActive,
                    tagCount = kvp.Value.Tags.Count,
                    sessionStart = kvp.Value.SessionStart
                }).ToArray();

                return new { success = true, sessions = sessions };
            }
        }

        public async Task<object> Disconnect(dynamic input)
        {
            if (_reader != null && _isConnected)
            {
                try
                {
                    _reader.Actions.Inventory.Stop();
                }
                catch { }

                // Clear all sessions
                lock (_sessionsLock)
                {
                    _sessions.Clear();
                }

                _reader.Disconnect();
                _reader = null;
                _isConnected = false;

                return "Disconnected";
            }
            return "Already disconnected";
        }

        public async Task<object> GetTags(dynamic input)
        {
            lock (_tags)
            {
                return _tags.ToArray();
            }
        }

        public async Task<object> ClearTags(dynamic input)
        {
            lock (_tags)
            {
                _tags.Clear();
            }
            return "Tags cleared";
        }
    }
}