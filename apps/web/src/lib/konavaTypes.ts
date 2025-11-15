import {
  Circle,
  Eraser,
  Hand,
  Minus,
  MoveUpRight,
  PencilLine,
  Square,
  TypeOutline,
  Image,
  Scan,
} from "lucide-react";

export const ACTIONS = {
  SELECT: "SELECT",
  MARQUEE_SELECT: "MARQUEE_SELECT",
  PENCIL: "PENCIL",
  CIRCLE: "CIRCLE",
  RECTANGLE: "RECTANGLE",
  ARROW: "ARROW",
  LINE: "LINE",
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  ERASER: "ERASER",
};

export const ACTION_BUTTONS = [
  {
    icon: Hand,
    label: "Select",
    value: ACTIONS.SELECT,
  },
  {
    icon: Scan,
    label: "Marquee Select",
    value: ACTIONS.MARQUEE_SELECT,
  },
  {
    icon: PencilLine,
    label: "Pencil",
    value: ACTIONS.PENCIL,
  },
  {
    icon: Circle,
    label: "Circle",
    value: ACTIONS.CIRCLE,
  },
  {
    icon: Square,
    label: "Rectangle",
    value: ACTIONS.RECTANGLE,
  },
  // {
  //   icon: MoveUpRight,
  //   label: "Arrow",
  //   value: ACTIONS.ARROW,
  // },
  // {
  //   icon: Minus,
  //   label: "Line",
  //   value: ACTIONS.LINE,
  // },
  {
    icon: TypeOutline,
    label: "Text",
    value: ACTIONS.TEXT,
  },
  {
    icon: Image,
    label: "Image",
    value: ACTIONS.IMAGE,
  },
  {
    icon: Eraser,
    label: "Eraser",
    value: ACTIONS.ERASER,
  },
];

export type Shape =
  | {
      id: string;
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      cornerRadius?: number;
    }
  | {
      id: string;
      type: "pencil";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
      tension?: number;
    }
  | {
      id: string;
      type: "arrow";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: "line";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: "text";
      text: string;
      x: number;
      y: number;
      fontSize?: number;
      fontFamily?: string;
      fill?: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }
  | {
      id: string;
      type: "eraser";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    };

export const TOOL_CURSOR = {
  [ACTIONS.PENCIL]: "crosshair",
  [ACTIONS.SELECT]: "grab", // use 'grab' (or 'grabbing' while dragging)
  [ACTIONS.MARQUEE_SELECT]: "crosshair",
  [ACTIONS.CIRCLE]: "crosshair", // there's no 'circle' cursor — use crosshair or custom
  [ACTIONS.RECTANGLE]: "crosshair",
  [ACTIONS.ARROW]: "pointer", // clickable/select
  [ACTIONS.LINE]: "crosshair",
  [ACTIONS.ERASER]: "url(/cursors/eraser.png), auto", // custom image, fallback `auto`
  default: "default",
};
