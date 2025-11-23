export const buildShapes = (data: any) => {
  return data.map((shape: any) => {
    if (shape.type === 'rect') {
      return {
        id: shape.uuid,
        type: 'rect',
        x: shape.data.x,
        y: shape.data.y,
        w: shape.data.w,
        h: shape.data.h,
        fill: shape.data.fill,
        stroke: shape.data.stroke,
        strokeWidth: shape.data.strokeWidth,
        points: shape.data.points,
      };
    }
    if (shape.type === 'circle') {
      return {
        id: shape.uuid,
        type: 'circle',
        x: shape.data.x,
        y: shape.data.y,
        r: shape.data.r,
        fill: shape.data.fill,
        stroke: shape.data.stroke,
        strokeWidth: shape.data.strokeWidth,
        points: shape.data.points,
      };
    }
    if (shape.type === 'line') {
      return {
        id: shape.uuid,
        type: 'line',
        points: shape.data.points,
        stroke: shape.data.stroke,
        strokeWidth: shape.data.strokeWidth,
      };
    }
    if (shape.type === 'pencil') {
      return {
        id: shape.uuid,
        type: 'pencil',
        points: shape.data.points,
        stroke: shape.data.stroke,
        strokeWidth: shape.data.strokeWidth,
      };
    }
  });
};
