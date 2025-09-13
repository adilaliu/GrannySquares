export default function CafeBorder({ top = 0 }: { top: any }) {
  return (
    <svg
      width="1440"
      height="180"
      viewBox="0 0 1440 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top,
        left: 0,
        width: "100%",
      }}
    >
      <circle cx="1" cy="90" r="90" fill="#CB9145" />
      <circle cx="161" cy="90" r="90" fill="#CB9145" />
      <circle cx="321" cy="90" r="90" fill="#CB9145" />
      <circle cx="481" cy="90" r="90" fill="#CB9145" />
      <circle cx="641" cy="90" r="90" fill="#CB9145" />
      <circle cx="801" cy="90" r="90" fill="#CB9145" />
      <circle cx="961" cy="90" r="90" fill="#CB9145" />
      <circle cx="1121" cy="90" r="90" fill="#CB9145" />
      <circle cx="1281" cy="90" r="90" fill="#CB9145" />
      <circle cx="1441" cy="90" r="90" fill="#CB9145" />
      <rect x="-89" width="1496" height="90" fill="#CB9145" />
      <rect x="-89" width="1559" height="40" fill="#EFBD77" />
    </svg>
  );
}
