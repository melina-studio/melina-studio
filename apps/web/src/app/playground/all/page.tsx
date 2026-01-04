"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon, Library } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

function Playground() {
  const router = useRouter();
  const { theme } = useTheme();

  function createNewBoard() {
    // generate random uuid for routing
    const id = uuidv4();
    router.push(`/playground/${id}`);
  }

  // set default settings
  useEffect(() => {
    // first check if settings are already set
    if (localStorage.getItem("settings")) {
      return;
    }

    // then set default settings
    localStorage.setItem(
      "settings",
      JSON.stringify({
        activeModel: "groq",
        temperature: 0.5,
        maxTokens: 1000,
        theme: theme,
      })
    );
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-2 text-center">Playground</h1>
      <p className="text-sm text-gray-500 text-center">
        This is a playground for testing and experimenting with the components.
      </p>
      <div className="flex gap-4 items-stretch w-full max-w-xl justify-center mt-4">
        {/* create new board button */}
        <div
          className="group flex flex-1 flex-col items-center justify-center border-2 border-gray-500 rounded-md p-4 cursor-pointer hover:bg-gray-800 hover:text-white dark:hover:bg-gray-100 transition-all duration-300 dark:hover:text-black"
          onClick={createNewBoard}
        >
          {/* plus icon */}
          <PlusIcon className="w-12 h-12 text-gray-500 dark:text-gray-500 group-hover:text-white dark:group-hover:text-gray-500" />
          <p className="text-lg font-semibold text-gray-500 dark:text-gray-500 group-hover:text-white dark:group-hover:text-gray-500">
            Create New Board
          </p>
        </div>
        {/* explore all boards button */}
        <div className="flex flex-1 flex-col items-center justify-center border-2 border-gray-500 rounded-md p-4 cursor-pointer hover:bg-gray-100 transition-all duration-300">
          <Library className="w-12 h-12 text-gray-500" />
          <p className="text-lg font-semibold text-gray-500">
            Explore All Boards
          </p>
        </div>
      </div>
    </div>
  );
}

export default Playground;
