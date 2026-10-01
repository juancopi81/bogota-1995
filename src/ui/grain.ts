// Film/paper grain over everything, so flat shapes feel printed, not digital.

export function mountGrain(parent: HTMLElement): void {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  // dark specks with varying alpha: grain without a blend mode (cheaper to composite)
  for (let i = 0; i < size * size; i++) {
    const a = Math.pow(Math.random(), 2.2) * 70;
    image.data[i * 4] = 40;
    image.data[i * 4 + 1] = 36;
    image.data[i * 4 + 2] = 30;
    image.data[i * 4 + 3] = a;
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
