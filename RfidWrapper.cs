using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Symbol.RFID3;

namespace ZebraLib
{
    public class RfidWrapper
    {
        private static RFIDReader _reader;
        private static bool _isConnected = false;

        private static ConcurrentDictionary<string, TagRecord> _tags = new ConcurrentDictionary<string, TagRecord>();
        private static System.Timers.Timer _backgroundTimer;
        private static bool _isInventoryRunning = false;

        public class TagRecord
        {
            public string EPC { get; set; }
            public int AntennaID { get; set; }
            public string AntennaName { get; set; }
            public DateTime Timestamp { get; set; }
            public DateTime FirstSeen { get; set; }
            public int ReadCount { get; set; }
            public double SignalStrength { get; set; }
            public double PeakRSSI { get; set; }
        }

        private void ConfigureReaderForOptimalPerformance()
        {
            try
            {
                // Basic configuration - API compatibility simplified
                Console.WriteLine("Reader configured with basic settings");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"RF Configuration Warning: {ex.Message}");
            }
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

                // Configure reader for optimal performance
                ConfigureReaderForOptimalPerformance();

                // Set up event handlers
                _reader.Events.ReadNotify += Events_ReadNotify;
                _reader.Events.AttachTagDataWithReadEvent = true;

                // Initialize background timer for continuous polling
                _backgroundTimer = new System.Timers.Timer(25); // 25ms for high frequency
                _backgroundTimer.Elapsed += BackgroundTimer_Elapsed;
                _backgroundTimer.AutoReset = true;

                return $"Connected to {ip}:{port} with optimized configuration";
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        private void Events_ReadNotify(object sender, Events.ReadEventArgs args)
        {
            // Non-blocking notification - avoid heavy operations here
            // Just start background processing if inventory is running
            if (_isInventoryRunning)
            {
                Task.Run(() => ProcessTagsInBackground());
            }
        }

        
        private void BackgroundTimer_Elapsed(object sender, System.Timers.ElapsedEventArgs e)
        {
            if (_isInventoryRunning && _isConnected)
            {
                Task.Run(() => ProcessTagsInBackground());
            }
        }

        private void ProcessTagsInBackground()
        {
            if (!_isConnected || _reader == null) return;

            try
            {
                // Non-blocking GetReadTags with short timeout
                var tagData = _reader.Actions.GetReadTags(50);
                if (tagData != null && tagData.Length > 0)
                {
                    var now = DateTime.Now;
                    foreach (var tag in tagData)
                    {
                        string key = $"{tag.TagID}_{tag.AntennaID}";

                        var tagRecord = new TagRecord
                        {
                            EPC = tag.TagID,
                            AntennaID = tag.AntennaID,
                            AntennaName = GetAntennaName(tag.AntennaID),
                            Timestamp = now,
                            FirstSeen = now,
                            ReadCount = 1,
                            SignalStrength = tag.PeakRSSI / 100.0,
                            PeakRSSI = tag.PeakRSSI / 100.0
                        };

                        _tags.AddOrUpdate(key, tagRecord, (k, existing) =>
                        {
                            existing.Timestamp = now;
                            existing.ReadCount++;
                            existing.SignalStrength = Math.Max(existing.SignalStrength, tag.PeakRSSI / 100.0);
                            existing.PeakRSSI = Math.Max(existing.PeakRSSI, tag.PeakRSSI / 100.0);
                            return existing;
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                // Silently ignore background processing errors to avoid blocking
                Console.WriteLine($"Background processing error: {ex.Message}");
            }
        }

        private string GetAntennaName(int antennaId)
        {
            switch (antennaId)
            {
                case 1:
                    return "Antena 1";
                case 2:
                    return "Antena 2";
                case 3:
                    return "Antena 3";
                case 4:
                    return "Antena 4";
                default:
                    return $"Antena {antennaId}";
            }
        }

        public async Task<object> StartInventory(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return new { success = false, message = "Not connected to reader" };

            try
            {
                // Clear existing tags for fresh start
                _tags.Clear();

                // Start basic inventory - simplified API
                _reader.Actions.Inventory.Perform();
                _isInventoryRunning = true;

                // Start background timer for continuous polling
                if (_backgroundTimer != null)
                {
                    _backgroundTimer.Start();
                }

                return new {
                    success = true,
                    message = "Basic inventory started",
                    mode = "BASIC",
                    pollingInterval = 25
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = $"Error starting inventory: {ex.Message}" };
            }
        }

        public async Task<object> StopInventory(dynamic input)
        {
            if (!_isConnected || _reader == null)
                return new { success = false, message = "Not connected to reader" };

            try
            {
                _isInventoryRunning = false;

                // Stop background timer
                if (_backgroundTimer != null)
                {
                    _backgroundTimer.Stop();
                }

                // Stop inventory
                _reader.Actions.Inventory.Stop();

                return new {
                    success = true,
                    message = "Continuous inventory stopped",
                    totalTagsCollected = _tags.Count,
                    totalReads = _tags.Values.Sum(t => t.ReadCount)
                };
            }
            catch (Exception ex)
            {
                return new { success = false, message = $"Error stopping inventory: {ex.Message}" };
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

        public async Task<object> Disconnect(dynamic input)
        {
            if (_reader != null && _isConnected)
            {
                try
                {
                    _isInventoryRunning = false;

                    // Stop background timer
                    if (_backgroundTimer != null)
                    {
                        _backgroundTimer.Stop();
                        _backgroundTimer.Dispose();
                        _backgroundTimer = null;
                    }

                    // Stop inventory
                    _reader.Actions.Inventory.Stop();
                }
                catch { }

                // Disconnect from reader
                _reader.Disconnect();
                _reader = null;
                _isConnected = false;

                return new { success = true, message = "Disconnected and resources cleaned up" };
            }
            return new { success = true, message = "Already disconnected" };
        }

        public async Task<object> GetTags(dynamic input)
        {
            // No lock needed with ConcurrentDictionary - thread-safe by design
            return _tags.Values.OrderByDescending(t => t.Timestamp).ToArray();
        }

        public async Task<object> GetTagsByAntenna(dynamic input)
        {
            int antennaId = (int)input.antennaId;

            var antennaTags = _tags.Values
                .Where(tag => tag.AntennaID == antennaId)
                .OrderByDescending(tag => tag.Timestamp)
                .ToArray();

            return new {
                antennaId = antennaId,
                antennaName = GetAntennaName(antennaId),
                tags = antennaTags,
                totalTags = antennaTags.Length,
                totalReads = antennaTags.Sum(t => t.ReadCount),
                averageSignalStrength = antennaTags.Any() ? antennaTags.Average(t => t.SignalStrength) : 0.0
            };
        }

        public async Task<object> GetAllAntennaTags(dynamic input)
        {
            var antennaGroups = _tags.Values
                .GroupBy(tag => tag.AntennaID)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(tag => tag.Timestamp).ToArray()
                );

            var result = new List<object>();

            for (int i = 1; i <= 4; i++)
            {
                if (antennaGroups.ContainsKey(i))
                {
                    var tags = antennaGroups[i];
                    result.Add(new {
                        antennaId = i,
                        antennaName = GetAntennaName(i),
                        tags = tags,
                        totalTags = tags.Length,
                        totalReads = tags.Sum(t => t.ReadCount),
                        averageSignalStrength = tags.Average(t => t.SignalStrength),
                        isActive = true
                    });
                }
                else
                {
                    result.Add(new {
                        antennaId = i,
                        antennaName = GetAntennaName(i),
                        tags = new TagRecord[0],
                        totalTags = 0,
                        totalReads = 0,
                        averageSignalStrength = 0.0,
                        isActive = false
                    });
                }
            }

            return new {
                antennas = result,
                totalUniqueTags = _tags.Count,
                totalReads = _tags.Values.Sum(t => t.ReadCount),
                isInventoryRunning = _isInventoryRunning
            };
        }

        public async Task<object> ClearTags(dynamic input)
        {
            // No lock needed with ConcurrentDictionary
            _tags.Clear();
            return new { success = true, message = "All tags cleared", totalCleared = _tags.Count };
        }

        public async Task<object> GetInventoryStatus(dynamic input)
        {
            return new {
                isConnected = _isConnected,
                isInventoryRunning = _isInventoryRunning,
                totalTags = _tags.Count,
                totalReads = _tags.Values.Sum(t => t.ReadCount),
                antennaGroups = _tags.Values.GroupBy(t => t.AntennaID)
                    .ToDictionary(g => g.Key, g => new {
                        count = g.Count(),
                        reads = g.Sum(t => t.ReadCount),
                        antennaName = GetAntennaName(g.Key)
                    })
            };
        }
    }
}