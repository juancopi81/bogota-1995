// Film/paper grain over everything, so flat shapes feel printed, not digital.

export function mountGrain(parent: HTMLElement): void {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 190 + Math.random() * 65;
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v - 6;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  // use it as a repeating background tile rather than a stretched canvas
  const tile = canvas.toDataURL();
  const layer = document.createElement('div');
  layer.id = 'grain';
  layer.style.backgroundImage = `url(${tile})`;
  layer.style.backgroundSize = '256px 256px';
  parent.appendChild(layer);
}
