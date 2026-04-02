// Mobile-only header — desktop navigation is handled by the Sidebar component
export function Header() {
  return (
    <header className="md:hidden border-b bg-white px-4 py-3 flex items-center">
      <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.03em", color: "#111111" }}>
        OfferPath
      </span>
    </header>
  );
}
