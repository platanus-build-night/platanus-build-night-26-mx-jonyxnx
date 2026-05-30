type Pixel = readonly [x: number, y: number, width: number, height: number, color: string];

const COLORS = {
  outline: "#362015",
  orange: "#f28c28",
  lightOrange: "#ffb14a",
  stripe: "#8a4a22",
  white: "#fff7e8",
  cream: "#f1dfc2",
  pink: "#f6a6a8",
  eye: "#171312",
  highlight: "#ffffff",
  nose: "#efb18a",
};

const CAT_PIXELS: Pixel[] = [
  [5, 4, 5, 7, COLORS.outline],
  [6, 5, 3, 4, COLORS.orange],
  [7, 6, 1, 2, COLORS.pink],
  [22, 4, 5, 7, COLORS.outline],
  [23, 5, 3, 4, COLORS.orange],
  [24, 6, 1, 2, COLORS.pink],
  [7, 5, 1, 1, COLORS.stripe],
  [24, 5, 1, 1, COLORS.stripe],

  [5, 8, 22, 13, COLORS.outline],
  [6, 9, 20, 11, COLORS.orange],
  [9, 11, 14, 8, COLORS.white],
  [7, 10, 3, 4, COLORS.lightOrange],
  [22, 10, 3, 4, COLORS.lightOrange],
  [10, 10, 1, 2, COLORS.stripe],
  [21, 10, 1, 2, COLORS.stripe],
  [7, 14, 3, 1, COLORS.stripe],
  [22, 14, 3, 1, COLORS.stripe],

  [10, 13, 3, 3, COLORS.eye],
  [11, 13, 1, 1, COLORS.highlight],
  [20, 13, 3, 3, COLORS.eye],
  [21, 13, 1, 1, COLORS.highlight],
  [15, 16, 2, 2, COLORS.nose],
  [14, 18, 1, 1, COLORS.outline],
  [16, 18, 1, 1, COLORS.outline],
  [18, 18, 1, 1, COLORS.outline],
  [4, 15, 4, 1, COLORS.outline],
  [4, 17, 4, 1, COLORS.outline],
  [4, 19, 4, 1, COLORS.outline],
  [24, 15, 4, 1, COLORS.outline],
  [24, 17, 4, 1, COLORS.outline],
  [24, 19, 4, 1, COLORS.outline],

  [6, 18, 19, 10, COLORS.outline],
  [7, 19, 17, 8, COLORS.orange],
  [10, 19, 10, 8, COLORS.white],
  [12, 22, 6, 5, COLORS.cream],
  [7, 21, 2, 1, COLORS.stripe],
  [23, 21, 2, 1, COLORS.stripe],
  [8, 27, 5, 3, COLORS.outline],
  [9, 27, 3, 2, COLORS.white],
  [19, 27, 5, 3, COLORS.outline],
  [20, 27, 3, 2, COLORS.white],

  [23, 18, 6, 4, COLORS.outline],
  [25, 21, 4, 7, COLORS.outline],
  [21, 26, 7, 4, COLORS.outline],
  [24, 19, 3, 2, COLORS.orange],
  [26, 22, 2, 5, COLORS.orange],
  [22, 27, 4, 2, COLORS.orange],
  [26, 23, 1, 1, COLORS.stripe],
  [23, 27, 1, 1, COLORS.stripe],
];

const SIZE_CLASS = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function PixelCat({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div
      aria-label="Cute orange and white pixel cat icon"
      className={`${SIZE_CLASS[size]} shrink-0 rounded-2xl border-2 border-stone-900/80 bg-gradient-to-br from-sky-200 via-amber-50 to-orange-100 p-1 shadow-sm`}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="h-full w-full rounded-xl"
        shapeRendering="crispEdges"
        viewBox="0 0 32 32"
      >
        {CAT_PIXELS.map(([x, y, width, height, color], index) => (
          <rect
            fill={color}
            height={height}
            key={`${x}-${y}-${index}`}
            width={width}
            x={x}
            y={y}
          />
        ))}
      </svg>
    </div>
  );
}
