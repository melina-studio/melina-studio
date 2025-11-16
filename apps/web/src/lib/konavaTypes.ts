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
  PaintBucket,
} from 'lucide-react';

export const ACTIONS = {
  SELECT: 'SELECT',
  MARQUEE_SELECT: 'MARQUEE_SELECT',
  PENCIL: 'PENCIL',
  CIRCLE: 'CIRCLE',
  RECTANGLE: 'RECTANGLE',
  ARROW: 'ARROW',
  LINE: 'LINE',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  ERASER: 'ERASER',
  COLOR: 'COLOR',
};

// types
export type History = {
  past: Shape[][];
  present: Shape[]; // current shapes
  future: Shape[][];
};

export const ACTION_BUTTONS = [
  {
    icon: Hand,
    label: 'Select',
    value: ACTIONS.SELECT,
  },
  {
    icon: Scan,
    label: 'Marquee Select',
    value: ACTIONS.MARQUEE_SELECT,
  },
  {
    icon: PencilLine,
    label: 'Pencil',
    value: ACTIONS.PENCIL,
  },
  {
    icon: Circle,
    label: 'Circle',
    value: ACTIONS.CIRCLE,
  },
  {
    icon: Square,
    label: 'Rectangle',
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
    label: 'Text',
    value: ACTIONS.TEXT,
  },
  {
    icon: Image,
    label: 'Image',
    value: ACTIONS.IMAGE,
  },
  {
    icon: Eraser,
    label: 'Eraser',
    value: ACTIONS.ERASER,
  },
  {
    icon: PaintBucket,
    label: 'Color',
    value: ACTIONS.COLOR,
  },
];

export const COLORS = [
  // Basic colors
  { color: '#000000' }, // black
  { color: '#494949ff' },
  { color: '#ffffff' }, // white

  // Reds
  { color: '#d9363e' },
  { color: '#ff4d4f' },
  { color: '#ff7875' },

  // Oranges
  { color: '#fa8c16' },
  { color: '#ffa940' },
  { color: '#ffbb96' },

  // Yellows
  { color: '#fadb14' },
  { color: '#fff566' },
  { color: '#ffec3d' },

  // Greens
  { color: '#52c41a' },
  { color: '#73d13d' },
  { color: '#b7eb8f' },

  // Blues
  { color: '#1677ff' },
  { color: '#40a9ff' },
  { color: '#91d5ff' },

  // Teals & Cyans
  { color: '#13c2c2' },
  { color: '#36cfc9' },
  { color: '#87e8de' },

  // Purples
  { color: '#722ed1' },
  { color: '#9254de' },
  { color: '#b37feb' },

  // Pinks
  { color: '#eb2f96' },
  { color: '#f759ab' },
  { color: '#ffadd2' },

  // Browns
  { color: '#8B4513' },
  { color: '#A0522D' },
  { color: '#D2B48C' },
];

export type Shape =
  | {
      id: string;
      type: 'rect';
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
      type: 'circle';
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
      type: 'pencil';
      points: number[];
      stroke?: string;
      strokeWidth?: number;
      tension?: number;
    }
  | {
      id: string;
      type: 'arrow';
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: 'line';
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: 'text';
      text: string;
      x: number;
      y: number;
      fontSize?: number;
      fontFamily?: string;
      fill?: string;
    }
  | {
      id: string;
      type: 'image';
      src: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }
  | {
      id: string;
      type: 'eraser';
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    };

export const TOOL_CURSOR = {
  [ACTIONS.PENCIL]: 'crosshair',
  [ACTIONS.SELECT]: 'grab', // use 'grab' (or 'grabbing' while dragging)
  [ACTIONS.MARQUEE_SELECT]: 'crosshair',
  [ACTIONS.CIRCLE]: 'crosshair', // there's no 'circle' cursor — use crosshair or custom
  [ACTIONS.RECTANGLE]: 'crosshair',
  [ACTIONS.ARROW]: 'pointer', // clickable/select
  [ACTIONS.LINE]: 'crosshair',
  [ACTIONS.ERASER]: 'url(/icons/eraser.svg) 4 4, auto', // custom image, fallback `auto`
  default: 'default',
};
