export default function CafeBorder({ top = 0 }: { top: any }) {
  return (
    <img
      src="/cafeborder.svg"
      alt="Cafe Border"
      style={{ top, width: "100%", left: 0,
        position: "absolute",
       }}
      width="1440"
      height="180"
    />
  );
}
