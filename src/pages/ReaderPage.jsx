import React from "react";
import ReaderControls from "../components/ReaderControls";
import LogViewer from "../components/LogViewer";
import TagsTable from "../components/TagsTable";

const ReaderPage = ({ rfidHook }) => {
  const {
    ip,
    setIp,
    port,
    setPort,
    power,
    setPower,
    logs,
    tags,
    logRef,
    connect,
    startInventory,
    stopInventory,
    disconnect,
    getTags,
    clearTags,
    getStatus,
    setPowerLevel,
  } = rfidHook;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        RFID Reader Settings
      </h2>

      <ReaderControls
        ip={ip}
        setIp={setIp}
        port={port}
        setPort={setPort}
        power={power}
        setPower={setPower}
        onConnect={connect}
        onStart={startInventory}
        onStop={stopInventory}
        onDisconnect={disconnect}
        onGetTags={getTags}
        onClearTags={clearTags}
        onStatus={getStatus}
        onSetPower={setPowerLevel}
      />

      <LogViewer logs={logs} logRef={logRef} />
      <TagsTable tags={tags} />
    </div>
  );
};

export default ReaderPage;
