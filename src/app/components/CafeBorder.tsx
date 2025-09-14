export default function CafeBorder({ top = 0 }: { top: any }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/cafeborder.svg"
      alt="Cafe Border"
      style={{ top, width: "100%", left: 0, position: "fixed" }}
      width="1440"
      height="180"
    />
  );
}
