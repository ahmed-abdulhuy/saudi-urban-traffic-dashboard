import Image from "next/image";
import HeaderNav from "./HeaderNav";

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Image src="/logo.png" width={80} height={40} alt="Traffic Insights Logo" />
        <span className="site-title">Saudi Arabia Traffic Congestion Observatory</span>

        <HeaderNav />
      </div>
    </header>
  );
}
