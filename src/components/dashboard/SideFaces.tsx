import Image from "next/image";

export default function SideFaces({ className = "" }) {
  return (
    <div className={`relative h-[521px] w-[361px] ${className}`.trim()}>
      <div className="absolute inset-[0.67%_0_0_0]">
        <div className="absolute inset-[0_-1.25%_-1.64%_-1.44%] relative h-full w-full">
          <Image
            src="/dashboard/side-face.svg"
            alt=""
            fill
            className="object-contain"
            sizes="361px"
          />
        </div>
      </div>
    </div>
  );
}
