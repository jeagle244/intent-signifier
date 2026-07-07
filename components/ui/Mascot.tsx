import Image from "next/image";

const POSES = {
  hi: { src: "/mascot/lime-hi.png", width: 262, height: 190 },
  stand: { src: "/mascot/lime-stand.png", width: 513, height: 368 },
  wave: { src: "/mascot/lime-wave.png", width: 252, height: 189 },
} as const;

export function Mascot({
  pose = "hi",
  size = 160,
  className = "",
}: {
  pose?: keyof typeof POSES;
  size?: number;
  className?: string;
}) {
  const { src, width, height } = POSES[pose];
  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      style={{ width: size, height: "auto" }}
      className={className}
      priority
    />
  );
}
