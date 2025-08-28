import React from "react";

const LogViewer = ({ logs, logRef }) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Activity Log</h3>
      <div
        ref={logRef}
        className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-sm h-48 overflow-y-auto font-mono whitespace-pre-wrap"
      >
        {logs}
      </div>
    </div>
  );
};

export default LogViewer;
