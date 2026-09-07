export default function Footer() {
  return (
    <footer className="bg-[#cfb991] py-6">
      <div className="mx-auto w-full max-w-6xl px-4 text-center text-sm text-black">
        © {new Date().getFullYear()} Purdue University Fort Wayne • DonRide
        {/* I'm not sure if this part is necessary */}
        <div className="mt-1">Developed by CS372 Team</div>
      </div>
    </footer>
  );
}
