export const buildShapes = (data: any) => {
  return data.map((shape: any) => {
    if (shape.type === 'rect') {
      return {
        id: shape.id,
        type: 'rect',
        x: shape.data.x,
        y: shape.data.y,
        w: shape.data.w,
        h: shape.data.h,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        points: shape.points,
      };
    }
    if (shape.type === 'circle') {
      return {
        id: shape.id,
        type: 'circle',
        x: shape.data.x,
        y: shape.data.y,
        r: shape.data.r,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        points: shape.points,
      };
    }
    if (shape.type === 'line') {
      return {
        id: shape.id,
        type: 'line',
        points: shape.data.points,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
      };
    }
    if (shape.type === 'pencil') {
      return {
        id: shape.id,
        type: 'pencil',
        points: shape.data.points,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
      };
    }
  });
};
