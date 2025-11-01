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
} from "lucide-react";

export const ACTIONS = {
  SELECT: "SELECT",
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
  {
    icon: MoveUpRight,
    label: "Arrow",
    value: ACTIONS.ARROW,
  },
  {
    icon: Minus,
    label: "Line",
    value: ACTIONS.LINE,
  },
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
