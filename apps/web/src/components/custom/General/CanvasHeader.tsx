import { StepBack, Loader, Settings2 } from "lucide-react";
import React from "react";
import { SettingsModal } from "../Canvas/SettingsModal";

const CanvasHeader = ({
  handleBack,
  id,
  saving,
  showSettings,
  setShowSettings,
  settings,
  setSettings,
  handleClearBoard,
  handleGetBoardState,
}: {
  handleBack: () => void;
  id: string;
  saving: boolean;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  settings: any;
  setSettings: (settings: any) => void;
  handleClearBoard: () => void;
  handleGetBoardState: () => void;
}) => {
  return (
    <div className="fixed w-full z-5 top-0 left-0 flex items-center justify-between px-4 py-4 bg-transparent">
      <div className="flex gap-4 items-center z-2">
        <div onClick={handleBack}>
          <StepBack className="w-4 h-4 cursor-pointer" />
        </div>
        <h4 className="font-semibold">Board ID: {id}</h4>
        {saving && (
          <div className="ml-4 flex gap-2 items-center">
            <Loader className="animate-spin" size={16} />
            <p className="text-md text-gray-500">Saving...</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className="bg-gray-200 hover:bg-gray-300 text-black rounded-md px-4 py-2 cursor-pointer flex items-center justify-center h-[36px]"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 className="w-4 h-4" />
          </div>

          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            activeSettings={settings}
            setActiveSettings={setSettings}
          />
        </div>
        <div
          className="bg-gray-200 text-black rounded-md px-4 py-2 cursor-pointer flex items-center justify-center min-w-[120px] h-[36px]"
          onClick={handleClearBoard}
        >
          Clear Board
        </div>
        <div
          className="bg-[#111] text-white rounded-md px-4 py-2 cursor-pointer flex items-center justify-center min-w-[120px] h-[36px]"
          onClick={() => handleGetBoardState()}
        >
          Export json
        </div>
      </div>
    </div>
  );
};

export default CanvasHeader;
