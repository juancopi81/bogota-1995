// Pointer coordinates in an SVG's own user units, whatever its on-screen scale.

export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: p.x, y: p.y };
}
